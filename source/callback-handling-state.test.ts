import assert from 'node:assert';
import type { Rule, Scope, SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import {
    arePathStatesSame,
    type CallbackHandlingOperation,
    type CallbackPathState,
    clonePathState,
    getCodeAfterCallbackHandlingNode,
    updatePathState
} from './callback-handling-state.js';

type CallExpressionNode = Readonly<Extract<CallbackHandlingOperation, { readonly type: 'call'; }>['node']>;
type MemberExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0]>;
type PropertyNode = Readonly<Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0]>;
type ObjectExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0]>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type LiteralNode =
    & Readonly<Extract<Readonly<CallExpressionNode['arguments'][number]>, { readonly type: 'Literal'; }>>
    & Readonly<Rule.Node>;
type SpreadElementNode = Extract<
    Readonly<CallExpressionNode['arguments'][number]>,
    { readonly type: 'SpreadElement'; }
>;
type PathStateOverrides = {
    readonly callbackHandled: boolean;
    readonly handledAliases: readonly string[];
    readonly handledContainerProperties: readonly (readonly [string, readonly string[]])[];
    readonly unhandledAliases: readonly string[];
    readonly unhandledContainerProperties: readonly (readonly [string, readonly string[]])[];
};

const defaultPathStateOverrides: PathStateOverrides = {
    callbackHandled: false,
    handledAliases: [],
    handledContainerProperties: [],
    unhandledAliases: [ 'done' ],
    unhandledContainerProperties: []
};

function asSourceCode(sourceCode: Readonly<Record<string, unknown>>): SourceCode {
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
        const nodeWithParent = node as Rule.Node & { readonly parent: Rule.Node; };
        nodeWithParent.parent = parent;
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
        setParent(propertyNode, node);
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
            containerProperties.map(function ([ binding, properties ]) {
                return [ binding, new Set(properties) ] as const;
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
): Extract<CallbackHandlingOperation, { readonly type: 'bindingAssignment'; }> {
    return { node, source, target, type: 'bindingAssignment' };
}

function containerPropertyAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { readonly type: 'containerPropertyAssignment'; }> {
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
): Extract<CallbackHandlingOperation, { readonly type: 'call'; }> {
    return {
        node: callExpression(callee, args),
        type: 'call'
    };
}

function createChangedClone(state: Readonly<CallbackPathState>): CallbackPathState {
    const clone = clonePathState(state);
    const callbackProperties = clone.handledReferences.containerPropertiesByBinding.get('callbacks') ?? [];

    return {
        ...clone,
        handledReferences: {
            aliasBindings: new Set([ ...clone.handledReferences.aliasBindings, 'other' ]),
            containerPropertiesByBinding: new Map([
                ...clone.handledReferences.containerPropertiesByBinding,
                [ 'callbacks', new Set([ ...callbackProperties, 'secondary' ]) ]
            ])
        }
    };
}

suite('callback handling state helpers', function () {
    test('clonePathState() deep-copies alias and container state', function () {
        const state = createPathState({
            callbackHandled: true,
            handledAliases: [ 'done', 'finish' ],
            handledContainerProperties: [ [ 'callbacks', [ 'complete' ] ] ],
            unhandledContainerProperties: [ [ 'nextCallbacks', [ 'finish' ] ] ]
        });
        const changedClone = createChangedClone(state);

        assert.deepStrictEqual(readSortedStrings(state.handledReferences.aliasBindings), [ 'done', 'finish' ]);
        assert.deepStrictEqual(readSortedStrings(changedClone.handledReferences.aliasBindings), [
            'done',
            'finish',
            'other'
        ]);
        assert.deepStrictEqual(
            readStrings(state.handledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            [ 'complete' ]
        );
        assert.deepStrictEqual(
            readStrings(changedClone.handledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
            [ 'complete', 'secondary' ]
        );
    });

    test('arePathStatesSame() distinguishes missing and changed states', function () {
        const state = createPathState({ handledAliases: [ 'done', 'finish' ] });

        assert.strictEqual(arePathStatesSame(undefined, state), false);
        assert.strictEqual(arePathStatesSame(clonePathState(state), state), true);
        assert.strictEqual(
            arePathStatesSame(state, createPathState({ callbackHandled: true, handledAliases: [ 'done', 'finish' ] })),
            false
        );
        assert.strictEqual(
            arePathStatesSame(
                createPathState({ handledAliases: [ 'done' ] }),
                createPathState({ handledAliases: [ 'done' ], unhandledAliases: [ 'finish' ] })
            ),
            false
        );
    });

    suite('path updates', function () {
        suite('references', function () {
            test('updatePathState() tracks aliased callback calls', function () {
                const sourceCode = createSourceCode();
                const aliasedState = updatePathState(
                    sourceCode,
                    createPathState(),
                    bindingAssignment(identifier('aliasAssignment'), 'finish', identifier('done'))
                );
                const handledState = updatePathState(sourceCode, aliasedState, callOperation(identifier('finish'), []));

                assert.strictEqual(handledState.callbackHandled, true);
                assert.deepStrictEqual(readSortedStrings(handledState.handledReferences.aliasBindings), [
                    'done',
                    'finish'
                ]);
            });

            test('updatePathState() clears callback aliases on reassignment', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState({ unhandledAliases: [ 'done', 'finish' ] }),
                    bindingAssignment(identifier('clearAlias'), 'finish', null)
                );

                assert.deepStrictEqual(readStrings(nextState.unhandledReferences.aliasBindings), [ 'done' ]);
            });

            test('updatePathState() copies callback container aliases through identifiers', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    updatePathState(
                        sourceCode,
                        createPathState(),
                        containerPropertyAssignment(
                            identifier('trackContainer'),
                            'holder',
                            'complete',
                            identifier('done')
                        )
                    ),
                    bindingAssignment(identifier('copyContainer'), 'callbacks', identifier('holder'))
                );

                assert.deepStrictEqual(
                    readStrings(nextState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
                    [ 'complete' ]
                );
            });

            test('updatePathState() keeps only static callback properties from object containers', function () {
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
                    readSortedStrings(
                        nextState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []
                    ),
                    [ 'alias', 'complete' ]
                );
            });

            test('updatePathState() skips identifier sources without tracked container properties', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState(),
                    bindingAssignment(identifier('trackMissingContainer'), 'callbacks', identifier('missingCallbacks'))
                );

                assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
            });

            test('updatePathState() skips object containers without tracked callback properties', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState(),
                    bindingAssignment(
                        identifier('trackEmptyContainer'),
                        'callbacks',
                        objectExpression([ property(literal('complete'), literal(0), true) ])
                    )
                );

                assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
            });

            test('updatePathState() clears callback container properties on reassignment', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState({ unhandledContainerProperties: [ [ 'callbacks', [ 'complete' ] ] ] }),
                    containerPropertyAssignment(identifier('clearProperty'), 'callbacks', 'complete', null)
                );

                assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
            });

            test('updatePathState() preserves unrelated containers on property reassignment', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState({
                        unhandledContainerProperties: [
                            [ 'callbacks', [ 'complete' ] ],
                            [ 'otherCallbacks', [ 'finish' ] ]
                        ]
                    }),
                    containerPropertyAssignment(identifier('clearProperty'), 'callbacks', 'complete', null)
                );

                assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
                assert.deepStrictEqual(
                    readStrings(nextState.unhandledReferences.containerPropertiesByBinding.get('otherCallbacks') ?? []),
                    [ 'finish' ]
                );
            });

            test('updatePathState() preserves unrelated callback containers on binding reassignment', function () {
                const sourceCode = createSourceCode();
                const nextState = updatePathState(
                    sourceCode,
                    createPathState({
                        unhandledContainerProperties: [
                            [ 'callbacks', [ 'complete' ] ],
                            [ 'otherCallbacks', [ 'finish' ] ]
                        ]
                    }),
                    bindingAssignment(identifier('clearContainer'), 'callbacks', null)
                );

                assert.strictEqual(nextState.unhandledReferences.containerPropertiesByBinding.has('callbacks'), false);
                assert.deepStrictEqual(
                    readStrings(nextState.unhandledReferences.containerPropertiesByBinding.get('otherCallbacks') ?? []),
                    [ 'finish' ]
                );
            });

            test('updatePathState() tracks dynamic callback container properties', function () {
                const sourceCode = createSourceCode();
                const trackedState = updatePathState(
                    sourceCode,
                    createPathState(),
                    containerPropertyAssignment(
                        identifier('trackDynamicProperty'),
                        'callbacks',
                        undefined,
                        identifier('done')
                    )
                );
                const dynamicCall = callOperation(
                    memberExpression(identifier('callbacks'), identifier('name'), true),
                    []
                );
                const callbackHandledState = createPathState({
                    callbackHandled: true,
                    unhandledContainerProperties: [ [ 'callbacks', [ '<dynamic>' ] ] ]
                });

                assert.deepStrictEqual(
                    readStrings(trackedState.unhandledReferences.containerPropertiesByBinding.get('callbacks') ?? []),
                    [ '<dynamic>' ]
                );
                assert.strictEqual(
                    getCodeAfterCallbackHandlingNode(sourceCode, callbackHandledState, dynamicCall),
                    undefined
                );
            });
        });

        suite('delegates', function () {
            test('updatePathState() treats delegated spread calls as callback handling', function () {
                const nextState = updatePathState(
                    createSourceCode(),
                    createPathState(),
                    callOperation(identifier('setTimeout'), [ spreadElement(identifier('done')), literal(0) ])
                );

                assert.strictEqual(nextState.callbackHandled, true);
                assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), [ 'done' ]);
            });

            test('updatePathState() treats global delegate calls as callback handling', function () {
                const nextState = updatePathState(
                    createSourceCode(),
                    createPathState(),
                    callOperation(memberExpression(identifier('globalThis'), identifier('setTimeout')), [
                        identifier('done'),
                        literal(0)
                    ])
                );

                assert.strictEqual(nextState.callbackHandled, true);
                assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), [ 'done' ]);
            });

            test('updatePathState() treats global aliases as callback handling delegates', function () {
                const nextState = updatePathState(
                    createSourceCode(),
                    createPathState(),
                    callOperation(memberExpression(identifier('global'), identifier('setTimeout')), [
                        identifier('done'),
                        literal(0)
                    ])
                );

                assert.strictEqual(nextState.callbackHandled, true);
                assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), [ 'done' ]);
            });

            test('updatePathState() treats window delegates as callback handling', function () {
                const nextState = updatePathState(
                    createSourceCode(),
                    createPathState(),
                    callOperation(memberExpression(identifier('window'), identifier('queueMicrotask')), [
                        identifier('done')
                    ])
                );

                assert.strictEqual(nextState.callbackHandled, true);
                assert.deepStrictEqual(readStrings(nextState.handledReferences.aliasBindings), [ 'done' ]);
            });

            test('updatePathState() ignores dynamic delegate calls', function () {
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
        });
    });
});
