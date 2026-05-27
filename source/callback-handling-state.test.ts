import type { Rule, Scope, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    arePathStatesSame,
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    type CallbackPathState,
    clonePathState,
    createEntryState,
    getCodeAfterCallbackHandlingNode,
    updatePathState
} from './callback-handling-state.js';

type MutableSegment = {
    id: string;
    nextSegments: MutableSegment[];
    prevSegments: MutableSegment[];
};

type CallExpressionNode = Extract<CallbackHandlingOperation, { type: 'call'; }>['node'];
type MemberExpressionNode = Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0];
type PropertyNode = Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0];
type ObjectExpressionNode = Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
type LiteralNode = Extract<Readonly<CallExpressionNode['arguments'][number]>, { type: 'Literal'; }> & Rule.Node;
type SpreadElementNode = Extract<Readonly<CallExpressionNode['arguments'][number]>, { type: 'SpreadElement'; }>;
type PathStateOverrides = {
    callbackHandled: boolean;
    handledAliases: readonly string[];
    handledContainerProperties: readonly (readonly [string, readonly string[]])[];
    unhandledAliases: readonly string[];
    unhandledContainerProperties: readonly (readonly [string, readonly string[]])[];
};

const defaultPathStateOverrides: PathStateOverrides = {
    callbackHandled: false,
    handledAliases: [],
    handledContainerProperties: [],
    unhandledAliases: ['done'],
    unhandledContainerProperties: []
};

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

function createSourceCode(): SourceCode {
    const scope = {
        childScopes: [],
        set: new Map(),
        upper: null
    } as unknown as Scope.Scope;

    return asSourceCode({
        getScope() {
            return scope;
        }
    });
}

function identifier(name: string): IdentifierNode {
    return { name, type: 'Identifier' } as unknown as IdentifierNode;
}

function literal(value: number | string | null): LiteralNode {
    return { type: 'Literal', value } as unknown as LiteralNode;
}

function setParent(node: Readonly<Rule.Node> | null | undefined, parent: Readonly<Rule.Node>): void {
    if (node !== null && node !== undefined) {
        Reflect.set(node, 'parent', parent);
    }
}

function memberExpression(
    object: Readonly<Rule.Node>,
    propertyNode: Readonly<Rule.Node>,
    computed = false
): MemberExpressionNode {
    const node = {
        computed,
        object,
        property: propertyNode,
        type: 'MemberExpression'
    } as unknown as MemberExpressionNode;

    setParent(object, node);
    setParent(propertyNode, node);

    return node;
}

function property(
    key: Readonly<Rule.Node>,
    value: Readonly<Rule.Node>,
    computed = false
): PropertyNode {
    const node = {
        computed,
        key,
        kind: 'init',
        type: 'Property',
        value
    } as unknown as PropertyNode;

    setParent(key, node);
    setParent(value, node);

    return node;
}

function objectExpression(properties: readonly Readonly<PropertyNode>[]): ObjectExpressionNode {
    const node = { properties, type: 'ObjectExpression' } as unknown as ObjectExpressionNode;

    for (const propertyNode of properties) {
        setParent(propertyNode as unknown as Rule.Node, node);
    }

    return node;
}

function callExpression(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): CallExpressionNode {
    const node = {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;

    setParent(callee, node);

    for (const argument of args) {
        setParent(argument as unknown as Rule.Node, node);
    }

    return node;
}

function spreadElement(argument: Readonly<Rule.Node>): SpreadElementNode {
    const node = { argument, type: 'SpreadElement' } as unknown as SpreadElementNode;

    setParent(argument, node as unknown as Rule.Node);

    return node;
}

function createSegment(id: string): MutableSegment {
    return { id, nextSegments: [], prevSegments: [] };
}

function asCodePathSegment(segment: MutableSegment): Rule.CodePathSegment {
    return segment as unknown as Rule.CodePathSegment;
}

function createCodePath(initialSegment: MutableSegment, returnedSegments: readonly MutableSegment[]): Rule.CodePath {
    return {
        initialSegment: asCodePathSegment(initialSegment),
        returnedSegments: returnedSegments.map(asCodePathSegment)
    } as unknown as Rule.CodePath;
}

function createContext(codePath: Readonly<Rule.CodePath>): CallbackHandlingContext {
    return {
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId: new Map(),
        sourceCode: createSourceCode()
    };
}

function compareStrings(left: string, right: string): number {
    return left.localeCompare(right);
}

function readStrings(values: Iterable<unknown>): string[] {
    return Array.from(values, String);
}

function readSortedStrings(values: Iterable<unknown>): string[] {
    return Array.from(values, String).toSorted(compareStrings);
}

function createReferenceState(
    aliases: readonly string[],
    containerProperties: readonly (readonly [string, readonly string[]])[] = []
): CallbackPathState['handledReferences'] {
    return {
        aliasBindings: new Set(aliases),
        containerPropertiesByBinding: new Map(
            containerProperties.map(([binding, properties]) => {
                return [binding, new Set(properties)] as const;
            })
        )
    };
}

function createPathState(overrides: Readonly<Partial<PathStateOverrides>> = {}): CallbackPathState {
    const resolvedOverrides = { ...defaultPathStateOverrides, ...overrides };

    return {
        callbackHandled: resolvedOverrides.callbackHandled,
        handledReferences: createReferenceState(
            resolvedOverrides.handledAliases,
            resolvedOverrides.handledContainerProperties
        ),
        unhandledReferences: createReferenceState(
            resolvedOverrides.unhandledAliases,
            resolvedOverrides.unhandledContainerProperties
        )
    };
}

function bindingAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { type: 'bindingAssignment'; }> {
    return { node, source, target, type: 'bindingAssignment' };
}

function containerPropertyAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { type: 'containerPropertyAssignment'; }> {
    return {
        node,
        propertyName,
        source,
        target,
        type: 'containerPropertyAssignment'
    };
}

function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Extract<CallbackHandlingOperation, { type: 'call'; }> {
    return {
        node: callExpression(callee, args),
        type: 'call'
    };
}

describe('callback handling state helpers', function () {
    it('clonePathState() deep-copies alias and container state', function () {
        const state = createPathState({
            callbackHandled: true,
            handledAliases: ['done', 'finish'],
            handledContainerProperties: [['callbacks', ['complete']]],
            unhandledContainerProperties: [['nextCallbacks', ['finish']]]
        });
        const clone = clonePathState(state);

        clone.handledReferences.aliasBindings.add('other');
        clone.handledReferences.containerPropertiesByBinding.get('callbacks')?.add('secondary');

        assert.deepStrictEqual(readSortedStrings(state.handledReferences.aliasBindings), ['done', 'finish']);
        assert.deepStrictEqual(
            readStrings(state.handledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            ['complete']
        );
    });

    it('arePathStatesSame() distinguishes missing and changed states', function () {
        const state = createPathState({ handledAliases: ['done', 'finish'] });

        assert.strictEqual(arePathStatesSame(undefined, state), false);
        assert.strictEqual(arePathStatesSame(clonePathState(state), state), true);
        assert.strictEqual(
            arePathStatesSame(state, createPathState({ callbackHandled: true, handledAliases: ['done', 'finish'] })),
            false
        );
        assert.strictEqual(
            arePathStatesSame(
                createPathState({ handledAliases: ['done'] }),
                createPathState({ handledAliases: ['done'], unhandledAliases: ['finish'] })
            ),
            false
        );
    });

    it('updatePathState() tracks aliased callback calls', function () {
        const sourceCode = createSourceCode();
        const aliasedState = updatePathState(
            sourceCode,
            createPathState(),
            bindingAssignment(identifier('aliasAssignment'), 'finish', identifier('done'))
        );
        const handledState = updatePathState(sourceCode, aliasedState, callOperation(identifier('finish'), []));

        assert.strictEqual(handledState.callbackHandled, true);
        assert.deepStrictEqual(readSortedStrings(handledState.handledReferences.aliasBindings), ['done', 'finish']);
    });

    it('updatePathState() clears callback aliases on reassignment', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            createPathState({ unhandledAliases: ['done', 'finish'] }),
            bindingAssignment(identifier('clearAlias'), 'finish', null)
        );

        assert.deepStrictEqual(readStrings(nextState.unhandledReferences.aliasBindings), ['done']);
    });

    it('updatePathState() copies callback container aliases through identifiers', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            updatePathState(
                sourceCode,
                createPathState(),
                containerPropertyAssignment(identifier('trackContainer'), 'holder', 'complete', identifier('done'))
            ),
            bindingAssignment(identifier('copyContainer'), 'callbacks', identifier('holder'))
        );

        assert.deepStrictEqual(
            readStrings(nextState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            ['complete']
        );
    });

    it('updatePathState() keeps only static callback properties from object containers', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            createPathState(),
            bindingAssignment(
                identifier('trackObject'),
                'callbacks',
                objectExpression([
                    property(literal('complete'), identifier('done'), true),
                    property(literal('alias'), identifier('done')),
                    property(identifier('dynamicName'), identifier('done'), true),
                    property(literal(null), identifier('done'))
                ])
            )
        );

        assert.deepStrictEqual(
            readSortedStrings(nextState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            ['alias', 'complete']
        );
    });

    it('updatePathState() skips identifier sources without tracked container properties', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            createPathState(),
            bindingAssignment(identifier('trackMissingContainer'), 'callbacks', identifier('missingCallbacks'))
        );

        assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
    });

    it('updatePathState() skips object containers without tracked callback properties', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            createPathState(),
            bindingAssignment(
                identifier('trackEmptyContainer'),
                'callbacks',
                objectExpression([property(literal('complete'), literal(0), true)])
            )
        );

        assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
    });

    it('updatePathState() clears callback container properties on reassignment', function () {
        const sourceCode = createSourceCode();
        const nextState = updatePathState(
            sourceCode,
            createPathState({ unhandledContainerProperties: [['callbacks', ['complete']]] }),
            containerPropertyAssignment(identifier('clearProperty'), 'callbacks', 'complete', null)
        );

        assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
    });

    it('updatePathState() tracks dynamic callback container properties', function () {
        const sourceCode = createSourceCode();
        const trackedState = updatePathState(
            sourceCode,
            createPathState(),
            containerPropertyAssignment(identifier('trackDynamicProperty'), 'callbacks', undefined, identifier('done'))
        );
        const dynamicCall = callOperation(memberExpression(identifier('callbacks'), identifier('name'), true), []);
        const callbackHandledState = createPathState({
            callbackHandled: true,
            unhandledContainerProperties: [['callbacks', ['<dynamic>']]]
        });

        assert.deepStrictEqual(
            readStrings(trackedState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            ['<dynamic>']
        );
        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, callbackHandledState, dynamicCall), undefined);
    });

    it('updatePathState() treats delegated spread calls as callback handling', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState(),
            callOperation(identifier('setTimeout'), [spreadElement(identifier('done')), literal(0)])
        );

        assert.strictEqual(nextState.callbackHandled, true);
        assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), ['done']);
    });

    it('updatePathState() treats global delegate calls as callback handling', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState(),
            callOperation(memberExpression(identifier('globalThis'), identifier('setTimeout')), [
                identifier('done'),
                literal(0)
            ])
        );

        assert.strictEqual(nextState.callbackHandled, true);
        assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), ['done']);
    });

    it('updatePathState() treats global aliases as callback handling delegates', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState(),
            callOperation(memberExpression(identifier('global'), identifier('setTimeout')), [
                identifier('done'),
                literal(0)
            ])
        );

        assert.strictEqual(nextState.callbackHandled, true);
        assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), ['done']);
    });

    it('updatePathState() treats window delegates as callback handling', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState(),
            callOperation(memberExpression(identifier('window'), identifier('queueMicrotask')), [
                identifier('done')
            ])
        );

        assert.strictEqual(nextState.callbackHandled, true);
        assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), ['done']);
    });

    it('updatePathState() ignores dynamic delegate calls', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState(),
            callOperation(memberExpression(identifier('globalThis'), identifier('delegateName'), true), [
                identifier('done')
            ])
        );

        assert.strictEqual(nextState.callbackHandled, false);
        assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), []);
    });

    it('getCodeAfterCallbackHandlingNode() reports non-callback operations after the callback', function () {
        const sourceCode = createSourceCode();
        const state = createPathState({ callbackHandled: true, handledAliases: ['done'] });
        const laterNode = identifier('laterStatement');
        const laterBindingAssignment = bindingAssignment(laterNode, 'finish', literal(0));
        const callbackCall = callOperation(identifier('done'), []);

        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, laterBindingAssignment), laterNode);
        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, callbackCall), undefined);
    });

    it('getCodeAfterCallbackHandlingNode() treats unsupported and untracked member calls as later code', function () {
        const sourceCode = createSourceCode();
        const state = createPathState({ callbackHandled: true, handledAliases: ['done'] });
        const unsupportedCall = callOperation(
            memberExpression(callExpression(identifier('getCallbacks'), []), identifier('complete')),
            []
        );
        const untrackedCall = callOperation(memberExpression(identifier('callbacks'), identifier('complete')), []);

        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, unsupportedCall), unsupportedCall.node);
        assert.strictEqual(getCodeAfterCallbackHandlingNode(sourceCode, state, untrackedCall), untrackedCall.node);
    });

    it('getCodeAfterCallbackHandlingNode() treats dynamic delegate paths as later code', function () {
        const sourceCode = createSourceCode();
        const state = createPathState({ callbackHandled: true, handledAliases: ['done'] });
        const dynamicDelegateCall = callOperation(
            memberExpression(identifier('globalThis'), identifier('delegateName'), true),
            [identifier('done')]
        );

        assert.strictEqual(
            getCodeAfterCallbackHandlingNode(sourceCode, state, dynamicDelegateCall),
            dynamicDelegateCall.node
        );
    });

    it('createEntryState() returns the initial callback state for initial and predecessor-less segments', function () {
        const start = createSegment('start');
        const orphan = createSegment('orphan');
        const handlingContext = createContext(createCodePath(start, [start]));

        const initialState = createEntryState(handlingContext, asCodePathSegment(start), new Map());
        const orphanState = createEntryState(handlingContext, asCodePathSegment(orphan), new Map());

        assert.deepStrictEqual(readStrings(initialState.unhandledReferences.aliasBindings), ['done']);
        assert.deepStrictEqual(readStrings(orphanState.unhandledReferences.aliasBindings), ['done']);
    });

    it('createEntryState() ignores predecessor states for the initial segment', function () {
        const start = createSegment('start');
        const previous = createSegment('previous');
        start.prevSegments.push(previous);

        const initialState = createEntryState(
            createContext(createCodePath(start, [start])),
            asCodePathSegment(start),
            new Map([
                [
                    'previous',
                    createPathState({
                        callbackHandled: true,
                        handledAliases: ['done'],
                        unhandledAliases: ['done', 'finish']
                    })
                ]
            ])
        );

        assert.strictEqual(initialState.callbackHandled, false);
        assert.deepStrictEqual(readStrings(initialState.handledReferences.aliasBindings), []);
        assert.deepStrictEqual(readStrings(initialState.unhandledReferences.aliasBindings), ['done']);
    });

    it('createEntryState() merges previous states and missing predecessor fallbacks', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const missing = createSegment('missing');
        const end = createSegment('end');
        end.prevSegments.push(left, missing);

        const entryState = createEntryState(
            createContext(createCodePath(start, [end])),
            asCodePathSegment(end),
            new Map([
                [
                    'left',
                    createPathState({
                        callbackHandled: true,
                        handledAliases: ['done'],
                        unhandledAliases: ['done', 'finish']
                    })
                ]
            ])
        );

        assert.strictEqual(entryState.callbackHandled, true);
        assert.deepStrictEqual(readStrings(entryState.handledReferences.aliasBindings), ['done']);
        assert.deepStrictEqual(readSortedStrings(entryState.unhandledReferences.aliasBindings), ['done', 'finish']);
    });
});
