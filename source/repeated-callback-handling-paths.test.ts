import assert from 'node:assert';
import type { Rule, Scope, SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import type { CallbackHandlingOperation } from './callback-handling-state.ts';
import { collectRepeatedCallbackHandlingNodes } from './repeated-callback-handling-paths.ts';

type MutableSegment = {
    readonly id: string;
    readonly nextSegments: readonly MutableSegment[];
    readonly prevSegments: readonly MutableSegment[];
};
type SegmentEdge = readonly [string, string];

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

function readSegment(segments: ReadonlyMap<string, MutableSegment>, id: string): MutableSegment {
    const segment = segments.get(id);

    if (segment === undefined) {
        throw new Error(`Expected segment "${id}".`);
    }

    return segment;
}

function createSegmentGraph(
    segmentIds: readonly string[],
    edges: readonly SegmentEdge[]
): ReadonlyMap<string, MutableSegment> {
    const segments = new Map<string, MutableSegment>();

    for (const id of segmentIds) {
        segments.set(id, {
            id,
            get nextSegments() {
                return edges
                    .filter(function ([ previousId ]) {
                        return previousId === id;
                    })
                    .map(function ([ , nextId ]) {
                        return readSegment(segments, nextId);
                    });
            },
            get prevSegments() {
                return edges
                    .filter(function ([ , nextId ]) {
                        return nextId === id;
                    })
                    .map(function ([ previousId ]) {
                        return readSegment(segments, previousId);
                    });
            }
        });
    }

    return segments;
}

function createSegment(id: string): MutableSegment {
    return readSegment(createSegmentGraph([ id ], []), id);
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

function createRevisitedCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'left', 'end', 'right' ],
        [
            [ 'start', 'left' ],
            [ 'start', 'end' ],
            [ 'start', 'right' ],
            [ 'left', 'end' ],
            [ 'right', 'end' ]
        ]
    );
    const start = readSegment(segments, 'start');
    const end = readSegment(segments, 'end');

    return createCodePath(start, [ end ]);
}

function bindingAssignment(target: string, source: Readonly<Rule.Node> | null): CallbackHandlingOperation {
    return {
        node: identifier(target),
        source,
        target,
        type: 'bindingAssignment'
    };
}

function containerPropertyAssignment(
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): CallbackHandlingOperation {
    return {
        node: identifier(target),
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

function analyzeOperations(
    operationsBySegmentId: ReadonlyMap<string, CallbackHandlingOperation[]>,
    codePath: Readonly<Rule.CodePath>
): readonly Rule.Node[] {
    return collectRepeatedCallbackHandlingNodes({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}

suite('repeated callback handling path helpers', function () {
    suite('callback references', function () {
        test('collectRepeatedCallbackHandlingNodes() reports repeated aliased calls', function () {
            const start = createSegment('start');
            const firstCall = callOperation(identifier('finish'), []);
            const secondCall = callOperation(identifier('finish'), []);

            const result = analyzeOperations(
                new Map([
                    [ 'start', [ bindingAssignment('finish', identifier('done')), firstCall, secondCall ] ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() tracks container aliases copied through identifiers', function () {
            const start = createSegment('start');
            const firstCall = callOperation(memberExpression(identifier('callbacks'), identifier('complete')), []);
            const secondCall = callOperation(memberExpression(identifier('callbacks'), identifier('complete')), []);

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('holder', 'complete', identifier('done')),
                            bindingAssignment('callbacks', identifier('holder')),
                            firstCall,
                            secondCall
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() tracks dynamic callback properties', function () {
            const start = createSegment('start');
            const firstCall = callOperation(memberExpression(identifier('callbacks'), identifier('name'), true), []);
            const secondCall = callOperation(memberExpression(identifier('callbacks'), identifier('name'), true), []);

            const result = analyzeOperations(
                new Map([
                    [ 'start', [
                        containerPropertyAssignment('callbacks', undefined, identifier('done')),
                        firstCall,
                        secondCall
                    ] ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() tracks object containers with literal keys', function () {
            const start = createSegment('start');
            const firstCall = callOperation(memberExpression(identifier('callbacks'), literal('complete'), true), []);
            const secondCall = callOperation(memberExpression(identifier('callbacks'), literal('complete'), true), []);

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            bindingAssignment(
                                'callbacks',
                                objectExpression([
                                    property(literal('complete'), identifier('done'), true),
                                    property(literal('alias'), identifier('done')),
                                    property(identifier('dynamicName'), identifier('done'), true),
                                    property(literal(null), identifier('done'))
                                ])
                            ),
                            firstCall,
                            secondCall
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() clears callback aliases on reassignment', function () {
            const start = createSegment('start');
            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            bindingAssignment('finish', identifier('done')),
                            bindingAssignment('finish', null),
                            callOperation(identifier('finish'), []),
                            callOperation(identifier('finish'), [])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, []);
        });

        test('collectRepeatedCallbackHandlingNodes() ignores non-object container sources', function () {
            const start = createSegment('start');
            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            bindingAssignment('callbacks', literal(0)),
                            callOperation(memberExpression(identifier('callbacks'), identifier('complete')), []),
                            callOperation(memberExpression(identifier('callbacks'), identifier('complete')), [])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, []);
        });
    });

    suite('path traversal', function () {
        test('collectRepeatedCallbackHandlingNodes() reports repeated delegated spread calls', function () {
            const start = createSegment('start');
            const firstCall = callOperation(identifier('setTimeout'), [
                spreadElement(identifier('done')),
                literal(0)
            ]);
            const secondCall = callOperation(identifier('setTimeout'), [
                spreadElement(identifier('done')),
                literal(0)
            ]);

            const result = analyzeOperations(
                new Map([
                    [ 'start', [ firstCall, secondCall ] ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() ignores dynamic delegate callees', function () {
            const start = createSegment('start');
            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            callOperation(identifier('done'), []),
                            callOperation(
                                memberExpression(identifier('globalThis'), identifier('delegateName'), true),
                                [ identifier('done') ]
                            )
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, []);
        });

        test('collectRepeatedCallbackHandlingNodes() ignores unsupported member expressions', function () {
            const start = createSegment('start');
            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('callbacks', 'complete', identifier('done')),
                            callOperation(
                                memberExpression(
                                    callExpression(identifier('getCallbacks'), []),
                                    identifier('complete')
                                ),
                                []
                            ),
                            callOperation(
                                memberExpression(
                                    callExpression(identifier('getCallbacks'), []),
                                    identifier('complete')
                                ),
                                []
                            )
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.deepStrictEqual(result, []);
        });

        test('collectRepeatedCallbackHandlingNodes() seeds segments without predecessors from the callback binding', function () {
            const segments = createSegmentGraph(
                [ 'start', 'orphan' ],
                [ [ 'start', 'orphan' ] ]
            );
            const start = readSegment(segments, 'start');
            const orphan = readSegment(segments, 'orphan');

            const firstCall = callOperation(identifier('done'), []);
            const secondCall = callOperation(identifier('done'), []);

            const result = analyzeOperations(
                new Map([
                    [ 'orphan', [ firstCall, secondCall ] ]
                ]),
                createCodePath(start, [ orphan ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });

        test('collectRepeatedCallbackHandlingNodes() revisits segments until their merged state stabilizes', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ bindingAssignment('finish', identifier('done')) ] ],
                    [ 'right', [ bindingAssignment('finish', identifier('done')) ] ]
                ]),
                createRevisitedCodePath()
            );

            assert.deepStrictEqual(result, []);
        });

        test('collectRepeatedCallbackHandlingNodes() falls back to the callback binding for missing predecessor state', function () {
            const segments = createSegmentGraph(
                [ 'start', 'missing', 'end' ],
                [
                    [ 'start', 'end' ],
                    [ 'missing', 'end' ]
                ]
            );
            const start = readSegment(segments, 'start');
            const end = readSegment(segments, 'end');

            const firstCall = callOperation(identifier('done'), []);
            const secondCall = callOperation(identifier('done'), []);

            const result = analyzeOperations(
                new Map([
                    [ 'end', [ firstCall, secondCall ] ]
                ]),
                createCodePath(start, [ end ])
            );

            assert.deepStrictEqual(result, [ secondCall.node ]);
        });
    });
});
