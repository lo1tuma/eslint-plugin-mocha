import assert from 'node:assert';
import type { Rule, Scope, SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import {
    collectCodeAfterCallbackHandlingNodes
} from './callback-handling-paths.ts';
import type { CallbackHandlingOperation } from './callback-handling-state.ts';

type MutableSegment = {
    readonly id: string;
    readonly nextSegments: readonly MutableSegment[];
    readonly prevSegments: readonly MutableSegment[];
};
type SegmentEdge = readonly [string, string];

type CallExpressionNode = Readonly<Extract<CallbackHandlingOperation, { readonly type: 'call'; }>['node']>;
type IdentifierNode = Readonly<Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0]>;
type LiteralNode =
    & Readonly<Extract<Readonly<CallExpressionNode['arguments'][number]>, { readonly type: 'Literal'; }>>
    & Readonly<Rule.Node>;

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

function callExpression(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): CallExpressionNode {
    return {
        arguments: args,
        callee,
        type: 'CallExpression'
    } as unknown as CallExpressionNode;
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

function bindingAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { readonly type: 'bindingAssignment'; }> {
    return { node, source, target, type: 'bindingAssignment' };
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
    return collectCodeAfterCallbackHandlingNodes({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}

suite('callback handling path helpers', function () {
    test('collectCodeAfterCallbackHandlingNodes() returns no nodes when no callback is handled', function () {
        const start = createSegment('start');
        const result = analyzeOperations(new Map(), createCodePath(start, [ start ]));

        assert.deepStrictEqual(result, []);
    });

    test('collectCodeAfterCallbackHandlingNodes() reports code after the callback once across revisits', function () {
        const afterDoneNode = identifier('afterDone');

        const result = analyzeOperations(
            new Map([
                [ 'left', [ callOperation(identifier('done'), []) ] ],
                [ 'end', [ bindingAssignment(afterDoneNode, 'finish', literal(0)) ] ]
            ]),
            createRevisitedCodePath()
        );

        assert.deepStrictEqual(result, [ afterDoneNode ]);
    });
});
