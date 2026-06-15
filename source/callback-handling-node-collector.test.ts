import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import { collectCallbackHandlingNodes } from './callback-handling-node-collector.js';
import type { CallbackHandlingOperation } from './callback-handling-state.js';

type MutableSegment = {
    readonly id: string;
    readonly nextSegments: readonly MutableSegment[];
    readonly prevSegments: readonly MutableSegment[];
};
type SegmentEdge = readonly [string, string];
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;

function identifier(name: string): IdentifierNode {
    return { id: name, name, type: 'Identifier' } as unknown as IdentifierNode;
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

function createSelfReferentialSegment(id: string): MutableSegment {
    const segment = {
        id,
        get nextSegments() {
            return [ segment ];
        },
        get prevSegments() {
            return [ segment ];
        }
    };

    return segment;
}

function asCodePathSegment(segment: MutableSegment): Rule.CodePathSegment {
    return segment as unknown as Rule.CodePathSegment;
}

function createCodePath(initialSegment: MutableSegment): Rule.CodePath {
    return {
        initialSegment: asCodePathSegment(initialSegment)
    } as unknown as Rule.CodePath;
}

function createSourceCode(): Rule.RuleContext['sourceCode'] {
    return Object.create(null) as Rule.RuleContext['sourceCode'];
}

function bindingAssignment(node: Readonly<Rule.Node>, target: string): CallbackHandlingOperation {
    return {
        node,
        source: null,
        target,
        type: 'bindingAssignment'
    };
}

suite('collectCallbackHandlingNodes()', function () {
    test('stops revisiting unchanged self-referential segments without reports', function () {
        const loop = createSelfReferentialSegment('loop');

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(loop),
                operationsBySegmentId: new Map(),
                sourceCode: createSourceCode()
            },
            function () {
                return undefined;
            }
        );

        assert.deepStrictEqual(result, []);
    });

    test('continues into following segments after reports with unchanged path state', function () {
        const segments = createSegmentGraph([ 'start', 'end' ], [ [ 'start', 'end' ] ]);
        const start = readSegment(segments, 'start');
        const firstNode = identifier('first');
        const secondNode = identifier('second');

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(start),
                operationsBySegmentId: new Map([
                    [ 'start', [ bindingAssignment(firstNode, 'first') ] ],
                    [ 'end', [ bindingAssignment(secondNode, 'second') ] ]
                ]),
                sourceCode: createSourceCode()
            },
            function (_context, _pathState, operation) {
                return operation.node;
            }
        );

        assert.deepStrictEqual(result, [ firstNode, secondNode ]);
    });

    test('re-enqueues following segments when later reports keep the path state unchanged', function () {
        const segments = createSegmentGraph(
            [ 'loop', 'end' ],
            [
                [ 'loop', 'end' ],
                [ 'loop', 'loop' ]
            ]
        );
        const loop = readSegment(segments, 'loop');
        const loopNode = identifier('loop');
        const endNode = identifier('end');
        let loopVisits = 0;

        const result = collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(loop),
                operationsBySegmentId: new Map([
                    [ 'loop', [ bindingAssignment(loopNode, 'loop') ] ],
                    [ 'end', [ bindingAssignment(endNode, 'end') ] ]
                ]),
                sourceCode: createSourceCode()
            },
            function (_context, _pathState, operation) {
                if (operation.node === loopNode) {
                    loopVisits += 1;
                    return loopVisits === 2 ? loopNode : undefined;
                }

                return loopVisits >= 2 ? operation.node : undefined;
            }
        );

        assert.deepStrictEqual(result, [ loopNode, endNode ]);
    });

    test('does not enqueue an already pending segment through another path', function () {
        const segments = createSegmentGraph(
            [ 'start', 'left', 'right' ],
            [
                [ 'start', 'left' ],
                [ 'start', 'right' ],
                [ 'left', 'right' ]
            ]
        );
        const start = readSegment(segments, 'start');
        const rightNode = identifier('right');
        let rightVisits = 0;

        collectCallbackHandlingNodes(
            {
                callbackBinding: 'done',
                codePath: createCodePath(start),
                operationsBySegmentId: new Map([
                    [ 'start', [ bindingAssignment(identifier('start'), 'start') ] ],
                    [ 'left', [ bindingAssignment(identifier('left'), 'left') ] ],
                    [ 'right', [ bindingAssignment(rightNode, 'right') ] ]
                ]),
                sourceCode: createSourceCode()
            },
            function (_context, _pathState, operation) {
                if (operation.node === rightNode) {
                    rightVisits += 1;
                }

                return undefined;
            }
        );

        assert.strictEqual(rightVisits, 1);
    });
});
