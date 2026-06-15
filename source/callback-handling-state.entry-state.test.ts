import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import {
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    type CallbackPathState,
    createEntryState,
    updatePathState
} from './callback-handling-state.ts';

type MutableSegment = {
    readonly id: string;
    readonly nextSegments: readonly MutableSegment[];
    readonly prevSegments: readonly MutableSegment[];
};

type CallExpressionNode = Readonly<Extract<CallbackHandlingOperation, { readonly type: 'call'; }>['node']>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type PathStateOptions = {
    readonly callbackHandled: boolean;
    readonly handledAliases: readonly string[];
    readonly handledContainerProperties: readonly (readonly [string, readonly string[]])[];
    readonly unhandledAliases: readonly string[];
};

function asCodePathSegment(segment: MutableSegment): Rule.CodePathSegment {
    return segment as unknown as Rule.CodePathSegment;
}

function createSegment(id: string): MutableSegment {
    return { id, nextSegments: [], prevSegments: [] };
}

function createSegmentWithPredecessors(id: string, prevSegments: readonly MutableSegment[]): MutableSegment {
    return {
        id,
        nextSegments: [],
        get prevSegments() {
            return Array.from(prevSegments);
        }
    };
}

function createCodePath(initialSegment: MutableSegment, returnedSegments: readonly MutableSegment[]): Rule.CodePath {
    return {
        initialSegment: asCodePathSegment(initialSegment),
        returnedSegments: returnedSegments.map(asCodePathSegment)
    } as unknown as Rule.CodePath;
}

function createSourceCode(): CallbackHandlingContext['sourceCode'] {
    const scope = {
        childScopes: [],
        set: new Map(),
        upper: null
    } as unknown as Rule.RuleContext['sourceCode']['scopeManager']['globalScope'];

    return {
        getScope() {
            return scope as unknown as ReturnType<Rule.RuleContext['sourceCode']['getScope']>;
        }
    } as unknown as CallbackHandlingContext['sourceCode'];
}

function createContext(codePath: Readonly<Rule.CodePath>): CallbackHandlingContext {
    return {
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId: new Map(),
        sourceCode: createSourceCode()
    };
}

function identifier(name: string): IdentifierNode {
    return { name, type: 'Identifier' } as unknown as IdentifierNode;
}

function readStringBindings(bindings: ReadonlySet<unknown>): string[] {
    return Array.from(bindings, function (binding) {
        if (typeof binding !== 'string') {
            throw new TypeError('Expected string binding.');
        }

        return binding;
    });
}

function setParent(node: Readonly<Rule.Node> | null | undefined, parent: Readonly<Rule.Node>): void {
    if (node !== null && node !== undefined) {
        const nodeWithParent = node as Rule.Node & { readonly parent: Rule.Node; };
        nodeWithParent.parent = parent;
    }
}

function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Parameters<typeof updatePathState>[2] {
    const node = {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;

    setParent(callee, node);

    for (const argument of args) {
        setParent(argument as unknown as Rule.Node, node);
    }

    return {
        node,
        type: 'call'
    };
}

function createPathState(overrides: PathStateOptions): CallbackPathState {
    return {
        callbackHandled: overrides.callbackHandled,
        handledReferences: {
            aliasBindings: new Set(overrides.handledAliases),
            containerPropertiesByBinding: new Map(
                overrides.handledContainerProperties.map(function ([ binding, properties ]) {
                    return [ binding, new Set(properties) ] as const;
                })
            )
        },
        unhandledReferences: {
            aliasBindings: new Set(overrides.unhandledAliases),
            containerPropertiesByBinding: new Map()
        }
    };
}

suite('callback handling entry state helpers', function () {
    test('updatePathState() ignores unknown delegate calls', function () {
        const nextState = updatePathState(
            createSourceCode(),
            createPathState({
                callbackHandled: false,
                handledAliases: [],
                handledContainerProperties: [],
                unhandledAliases: [ 'done' ]
            }),
            callOperation(identifier('scheduleLater'), [ identifier('done') ])
        );

        assert.strictEqual(nextState.callbackHandled, false);
        assert.deepStrictEqual(Array.from(nextState.handledReferences.aliasBindings, String), []);
    });

    test('createEntryState() merges tracked container properties from previous states', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegmentWithPredecessors('end', [ left, right ]);

        const entryState = createEntryState(
            createContext(createCodePath(start, [ end ])),
            asCodePathSegment(end),
            new Map([
                [
                    'left',
                    createPathState({
                        callbackHandled: false,
                        handledAliases: [],
                        handledContainerProperties: [ [ 'callbacks', [ 'complete' ] ] ],
                        unhandledAliases: [ 'done' ]
                    })
                ],
                [
                    'right',
                    createPathState({
                        callbackHandled: false,
                        handledAliases: [],
                        handledContainerProperties: [ [ 'callbacks', [ 'finish' ] ] ],
                        unhandledAliases: [ 'done' ]
                    })
                ]
            ])
        );

        assert.deepStrictEqual(
            Array.from(entryState.handledReferences.containerPropertiesByBinding.get('callbacks') ?? []).toSorted(
                function (currentValue, nextValue) {
                    return currentValue.localeCompare(nextValue);
                }
            ),
            [ 'complete', 'finish' ]
        );
    });

    test('createEntryState() returns the initial callback state for initial and predecessor-less segments', function () {
        const start = createSegment('start');
        const orphan = createSegment('orphan');
        const handlingContext = createContext(createCodePath(start, [ start ]));

        const initialState = createEntryState(handlingContext, asCodePathSegment(start), new Map());
        const orphanState = createEntryState(handlingContext, asCodePathSegment(orphan), new Map());

        assert.deepStrictEqual(Array.from(initialState.unhandledReferences.aliasBindings), [ 'done' ]);
        assert.deepStrictEqual(Array.from(orphanState.unhandledReferences.aliasBindings), [ 'done' ]);
    });

    test('createEntryState() ignores predecessor states for the initial segment', function () {
        const previous = createSegment('previous');
        const start = createSegmentWithPredecessors('start', [ previous ]);

        const initialState = createEntryState(
            createContext(createCodePath(start, [ start ])),
            asCodePathSegment(start),
            new Map([
                [
                    'previous',
                    createPathState({
                        callbackHandled: true,
                        handledAliases: [ 'done' ],
                        handledContainerProperties: [],
                        unhandledAliases: [ 'done', 'finish' ]
                    })
                ]
            ])
        );

        assert.strictEqual(initialState.callbackHandled, false);
        assert.deepStrictEqual(Array.from(initialState.handledReferences.aliasBindings), []);
        assert.deepStrictEqual(Array.from(initialState.unhandledReferences.aliasBindings), [ 'done' ]);
    });

    test('createEntryState() merges previous states and missing predecessor fallbacks', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const missing = createSegment('missing');
        const end = createSegmentWithPredecessors('end', [ left, missing ]);

        const entryState = createEntryState(
            createContext(createCodePath(start, [ end ])),
            asCodePathSegment(end),
            new Map([
                [
                    'left',
                    createPathState({
                        callbackHandled: true,
                        handledAliases: [ 'done' ],
                        handledContainerProperties: [],
                        unhandledAliases: [ 'done', 'finish' ]
                    })
                ]
            ])
        );

        assert.strictEqual(entryState.callbackHandled, true);
        assert.deepStrictEqual(Array.from(entryState.handledReferences.aliasBindings), [ 'done' ]);
        assert.deepStrictEqual(
            readStringBindings(entryState.unhandledReferences.aliasBindings).toSorted(function (
                currentBinding,
                nextBinding
            ) {
                return currentBinding.localeCompare(nextBinding);
            }),
            [ 'done', 'finish' ]
        );
    });
});
