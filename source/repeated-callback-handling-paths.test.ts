import type { Rule, Scope, SourceCode } from 'eslint';
import assert from 'node:assert';
import type { CallbackHandlingOperation } from './callback-handling-state.js';
import {
    collectRepeatedCallbackHandlingNodes,
    getRepeatedCallbackHandlingNode
} from './repeated-callback-handling-paths.js';

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

function linkSegments(previous: MutableSegment, next: MutableSegment): void {
    previous.nextSegments.push(next);
    next.prevSegments.push(previous);
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
    return collectRepeatedCallbackHandlingNodes({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}

function createPathState(callbackHandled: boolean): {
    callbackHandled: boolean;
    handledReferences: {
        aliasBindings: Set<string>;
        containerPropertiesByBinding: Map<string, Set<string>>;
    };
    unhandledReferences: {
        aliasBindings: Set<string>;
        containerPropertiesByBinding: Map<string, Set<string>>;
    };
} {
    return {
        callbackHandled,
        handledReferences: {
            aliasBindings: new Set(),
            containerPropertiesByBinding: new Map()
        },
        unhandledReferences: {
            aliasBindings: new Set(),
            containerPropertiesByBinding: new Map()
        }
    };
}

describe('repeated callback handling path helpers', function () {
    it('getRepeatedCallbackHandlingNode() ignores non-call operations after callback handling', function () {
        const result = getRepeatedCallbackHandlingNode(
            {
                callbackBinding: 'done',
                codePath: createCodePath(createSegment('start'), []),
                operationsBySegmentId: new Map(),
                sourceCode: createSourceCode()
            },
            createPathState(true),
            bindingAssignment('finish', null)
        );

        assert.strictEqual(result, undefined);
    });

    it('collectRepeatedCallbackHandlingNodes() reports repeated aliased calls', function () {
        const start = createSegment('start');
        const firstCall = callOperation(identifier('finish'), []);
        const secondCall = callOperation(identifier('finish'), []);

        const result = analyzeOperations(
            new Map([
                ['start', [bindingAssignment('finish', identifier('done')), firstCall, secondCall]]
            ]),
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() tracks container aliases copied through identifiers', function () {
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
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() tracks dynamic callback properties', function () {
        const start = createSegment('start');
        const firstCall = callOperation(memberExpression(identifier('callbacks'), identifier('name'), true), []);
        const secondCall = callOperation(memberExpression(identifier('callbacks'), identifier('name'), true), []);

        const result = analyzeOperations(
            new Map([
                ['start', [
                    containerPropertyAssignment('callbacks', undefined, identifier('done')),
                    firstCall,
                    secondCall
                ]]
            ]),
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() tracks object containers with literal keys', function () {
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
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() clears callback aliases on reassignment', function () {
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
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, []);
    });

    it('collectRepeatedCallbackHandlingNodes() ignores non-object container sources', function () {
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
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, []);
    });

    it('collectRepeatedCallbackHandlingNodes() reports repeated delegated spread calls', function () {
        const start = createSegment('start');
        const firstCall = callOperation(identifier('setTimeout'), [spreadElement(identifier('done')), literal(0)]);
        const secondCall = callOperation(identifier('setTimeout'), [spreadElement(identifier('done')), literal(0)]);

        const result = analyzeOperations(
            new Map([
                ['start', [firstCall, secondCall]]
            ]),
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() ignores dynamic delegate callees', function () {
        const start = createSegment('start');
        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        callOperation(identifier('done'), []),
                        callOperation(
                            memberExpression(identifier('globalThis'), identifier('delegateName'), true),
                            [identifier('done')]
                        )
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, []);
    });

    it('collectRepeatedCallbackHandlingNodes() ignores unsupported member expressions', function () {
        const start = createSegment('start');
        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        containerPropertyAssignment('callbacks', 'complete', identifier('done')),
                        callOperation(
                            memberExpression(callExpression(identifier('getCallbacks'), []), identifier('complete')),
                            []
                        ),
                        callOperation(
                            memberExpression(callExpression(identifier('getCallbacks'), []), identifier('complete')),
                            []
                        )
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.deepStrictEqual(result, []);
    });

    it('collectRepeatedCallbackHandlingNodes() seeds segments without predecessors from the callback binding', function () {
        const start = createSegment('start');
        const orphan = createSegment('orphan');
        start.nextSegments.push(orphan);

        const firstCall = callOperation(identifier('done'), []);
        const secondCall = callOperation(identifier('done'), []);

        const result = analyzeOperations(
            new Map([
                ['orphan', [firstCall, secondCall]]
            ]),
            createCodePath(start, [orphan])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });

    it('collectRepeatedCallbackHandlingNodes() revisits segments until their merged state stabilizes', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const end = createSegment('end');
        const right = createSegment('right');

        start.nextSegments.push(left, end, right);
        left.prevSegments.push(start);
        right.prevSegments.push(start);
        left.nextSegments.push(end);
        right.nextSegments.push(end);
        end.prevSegments.push(left, right);

        const result = analyzeOperations(
            new Map([
                ['left', [bindingAssignment('finish', identifier('done'))]],
                ['right', [bindingAssignment('finish', identifier('done'))]]
            ]),
            createCodePath(start, [end])
        );

        assert.deepStrictEqual(result, []);
    });

    it('collectRepeatedCallbackHandlingNodes() falls back to the callback binding for missing predecessor state', function () {
        const start = createSegment('start');
        const missing = createSegment('missing');
        const end = createSegment('end');

        linkSegments(start, end);
        end.prevSegments.push(missing);

        const firstCall = callOperation(identifier('done'), []);
        const secondCall = callOperation(identifier('done'), []);

        const result = analyzeOperations(
            new Map([
                ['end', [firstCall, secondCall]]
            ]),
            createCodePath(start, [end])
        );

        assert.deepStrictEqual(result, [secondCall.node]);
    });
});
