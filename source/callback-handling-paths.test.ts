import type { Rule, Scope, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    collectCodeAfterCallbackHandlingNodes
} from './callback-handling-paths.js';
import type { CallbackHandlingOperation } from './callback-handling-state.js';

type MutableSegment = {
    id: string;
    nextSegments: MutableSegment[];
    prevSegments: MutableSegment[];
};

type CallExpressionNode = Extract<CallbackHandlingOperation, { type: 'call'; }>['node'];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
type LiteralNode = Extract<Readonly<CallExpressionNode['arguments'][number]>, { type: 'Literal'; }> & Rule.Node;

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

function bindingAssignment(
    node: Readonly<Rule.Node>,
    target: string,
    source: Readonly<Rule.Node> | null
): Extract<CallbackHandlingOperation, { type: 'bindingAssignment'; }> {
    return { node, source, target, type: 'bindingAssignment' };
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

function analyzeOperations(
    operationsBySegmentId: ReadonlyMap<string, readonly CallbackHandlingOperation[]>,
    codePath: Readonly<Rule.CodePath>
): readonly Rule.Node[] {
    return collectCodeAfterCallbackHandlingNodes({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}

describe('callback handling path helpers', function () {
    it('collectCodeAfterCallbackHandlingNodes() returns no nodes when no callback is handled', function () {
        const start = createSegment('start');
        const result = analyzeOperations(new Map(), createCodePath(start, [start]));

        assert.deepStrictEqual(result, []);
    });

    it('collectCodeAfterCallbackHandlingNodes() reports code after the callback once across revisits', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const end = createSegment('end');
        const right = createSegment('right');
        const afterDoneNode = identifier('afterDone');

        start.nextSegments.push(left, end, right);
        left.prevSegments.push(start);
        right.prevSegments.push(start);
        left.nextSegments.push(end);
        right.nextSegments.push(end);
        end.prevSegments.push(left, right);

        const result = analyzeOperations(
            new Map([
                ['left', [callOperation(identifier('done'), [])]],
                ['end', [bindingAssignment(afterDoneNode, 'finish', literal(0))]]
            ]),
            createCodePath(start, [end])
        );

        assert.deepStrictEqual(result, [afterDoneNode]);
    });
});
