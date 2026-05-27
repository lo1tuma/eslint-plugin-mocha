import type { Rule, Scope, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    getMemberExpressionBindingAndProperty,
    hasUnhandledReturnPath,
    haveSameTrackedBindings,
    haveSameTrackedContainerProperties,
    type Operation
} from './done-callback-paths.js';

type MutableSegment = {
    id: string;
    nextSegments: MutableSegment[];
    prevSegments: MutableSegment[];
};

type CallOperationNode = Extract<Operation, { type: 'call'; }>['node'];
type MemberExpressionNode = Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0];
type PropertyNode = Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0];
type ObjectExpressionNode = Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0];
type CallExpressionNode = Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
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
    return { type: 'Identifier', name } as unknown as IdentifierNode;
}

function literal(value: number | string | null): Rule.Node {
    return { type: 'Literal', value } as unknown as Rule.Node;
}

function privateIdentifier(name: string): Rule.Node {
    return { type: 'PrivateIdentifier', name } as unknown as Rule.Node;
}

function memberExpression(
    object: Readonly<Rule.Node>,
    propertyNode: Readonly<Rule.Node>,
    computed = false
): MemberExpressionNode {
    return {
        computed,
        object,
        property: propertyNode,
        type: 'MemberExpression'
    } as unknown as MemberExpressionNode;
}

function property(
    key: Readonly<Rule.Node>,
    value: Readonly<Rule.Node>,
    computed = false
): PropertyNode {
    return {
        computed,
        key,
        kind: 'init',
        type: 'Property',
        value
    } as unknown as PropertyNode;
}

function objectExpression(
    properties: readonly Readonly<PropertyNode | SpreadElementNode>[]
): ObjectExpressionNode {
    return { properties, type: 'ObjectExpression' } as unknown as ObjectExpressionNode;
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

function spreadElement(argument: Readonly<Rule.Node>): SpreadElementNode {
    return { argument, type: 'SpreadElement' } as unknown as SpreadElementNode;
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

function bindingAssignment(target: string, source: Readonly<Rule.Node> | null): Operation {
    return { source, target, type: 'bindingAssignment' };
}

function containerPropertyAssignment(
    target: string,
    propertyName: string | undefined,
    source: Readonly<Rule.Node> | null
): Operation {
    return {
        propertyName,
        source,
        target,
        type: 'containerPropertyAssignment'
    };
}

function callOperation(
    callee: Readonly<Rule.Node>,
    args: readonly Readonly<CallExpressionNode['arguments'][number]>[]
): Operation {
    return {
        node: callExpression(callee, args) as CallOperationNode,
        type: 'call'
    };
}

function analyzeOperations(
    operationsBySegmentId: ReadonlyMap<string, readonly Operation[]>,
    codePath: Readonly<Rule.CodePath>
): boolean {
    return hasUnhandledReturnPath({
        callbackBinding: 'done',
        codePath,
        operationsBySegmentId,
        sourceCode: createSourceCode()
    });
}

describe('done callback path helpers', function () {
    it('getMemberExpressionBindingAndProperty() resolves static and computed properties', function () {
        const sourceCode = createSourceCode();

        assert.deepStrictEqual(
            getMemberExpressionBindingAndProperty(sourceCode, memberExpression(identifier('obj'), identifier('done'))),
            { binding: 'obj', propertyName: 'done' }
        );
        assert.deepStrictEqual(
            getMemberExpressionBindingAndProperty(
                sourceCode,
                memberExpression(identifier('obj'), literal('done'), true)
            ),
            { binding: 'obj', propertyName: 'done' }
        );
        assert.deepStrictEqual(
            getMemberExpressionBindingAndProperty(
                sourceCode,
                memberExpression(identifier('obj'), identifier('key'), true)
            ),
            { binding: 'obj', propertyName: undefined }
        );
        assert.deepStrictEqual(
            getMemberExpressionBindingAndProperty(
                sourceCode,
                memberExpression(identifier('obj'), privateIdentifier('done'))
            ),
            { binding: 'obj', propertyName: undefined }
        );
        assert.strictEqual(
            getMemberExpressionBindingAndProperty(
                sourceCode,
                memberExpression(callExpression(identifier('factory'), []), identifier('done'))
            ),
            undefined
        );
    });

    it('hasUnhandledReturnPath() keeps aliases shared by every branch', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegment('end');

        linkSegments(start, left);
        linkSegments(start, right);
        linkSegments(left, end);
        linkSegments(right, end);

        const result = analyzeOperations(
            new Map([
                ['left', [bindingAssignment('next', identifier('done'))]],
                ['right', [bindingAssignment('next', identifier('done'))]],
                ['end', [callOperation(identifier('foo'), [identifier('next')])]]
            ]),
            createCodePath(start, [end])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() drops aliases missing from one branch', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegment('end');

        linkSegments(start, left);
        linkSegments(start, right);
        linkSegments(left, end);
        linkSegments(right, end);

        const result = analyzeOperations(
            new Map([
                ['left', [bindingAssignment('next', identifier('done'))]],
                ['end', [callOperation(identifier('foo'), [identifier('next')])]]
            ]),
            createCodePath(start, [end])
        );

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() keeps shared container properties across branches', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegment('end');

        linkSegments(start, left);
        linkSegments(start, right);
        linkSegments(left, end);
        linkSegments(right, end);

        const result = analyzeOperations(
            new Map([
                ['left', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]],
                ['right', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]],
                ['end', [callOperation(identifier('foo'), [identifier('obj')])]]
            ]),
            createCodePath(start, [end])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() drops container properties when branches diverge', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const right = createSegment('right');
        const end = createSegment('end');

        linkSegments(start, left);
        linkSegments(start, right);
        linkSegments(left, end);
        linkSegments(right, end);

        const result = analyzeOperations(
            new Map([
                ['left', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]],
                ['right', [containerPropertyAssignment('obj', 'otherFunc', identifier('done'))]],
                ['end', [callOperation(identifier('foo'), [identifier('obj')])]]
            ]),
            createCodePath(start, [end])
        );

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() drops container properties missing from any branch', function () {
        const start = createSegment('start');
        const left = createSegment('left');
        const middle = createSegment('middle');
        const right = createSegment('right');
        const end = createSegment('end');

        linkSegments(start, left);
        linkSegments(start, middle);
        linkSegments(start, right);
        linkSegments(left, end);
        linkSegments(middle, end);
        linkSegments(right, end);

        const result = analyzeOperations(
            new Map([
                ['left', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]],
                ['middle', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]],
                ['end', [callOperation(identifier('foo'), [identifier('obj')])]]
            ]),
            createCodePath(start, [end])
        );

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() handles inline callback containers with static keys', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        callOperation(identifier('foo'), [
                            objectExpression([property(literal('someFunc'), identifier('done'))])
                        ])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() ignores spread elements in callback containers', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        callOperation(identifier('foo'), [
                            objectExpression([
                                property(literal('someFunc'), identifier('done')),
                                spreadElement(identifier('rest'))
                            ])
                        ])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() ignores inline callback containers with dynamic keys', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        callOperation(identifier('foo'), [
                            objectExpression([property(identifier('someFunc'), identifier('done'), true)])
                        ])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() tracks and clears dynamic container properties', function () {
        const start = createSegment('start');

        const trackedResult = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        containerPropertyAssignment('obj', undefined, identifier('done')),
                        callOperation(identifier('foo'), [memberExpression(identifier('obj'), identifier('key'), true)])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );
        const clearedResult = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        containerPropertyAssignment('obj', undefined, identifier('done')),
                        containerPropertyAssignment('obj', undefined, null),
                        callOperation(identifier('foo'), [memberExpression(identifier('obj'), identifier('key'), true)])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(trackedResult, false);
        assert.strictEqual(clearedResult, true);
    });

    it('hasUnhandledReturnPath() preserves remaining container properties on targeted reassignment', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        containerPropertyAssignment('obj', 'someFunc', identifier('done')),
                        containerPropertyAssignment('obj', 'otherFunc', identifier('done')),
                        containerPropertyAssignment('obj', 'someFunc', null),
                        callOperation(identifier('foo'), [identifier('obj')])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() treats spread callback handoffs as handled', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        callOperation(identifier('foo'), [spreadElement(identifier('done'))])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() ignores untracked property handoffs', function () {
        const start = createSegment('start');

        const result = analyzeOperations(
            new Map([
                [
                    'start',
                    [
                        bindingAssignment('next', null),
                        callOperation(identifier('foo'), [
                            memberExpression(callExpression(identifier('factory'), []), identifier('someFunc'))
                        ]),
                        callOperation(identifier('foo'), [memberExpression(identifier('obj'), identifier('someFunc'))])
                    ]
                ]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() treats missing predecessor states as handled', function () {
        const start = createSegment('start');
        const missing = createSegment('missing');
        const end = createSegment('end');

        linkSegments(start, end);
        end.prevSegments.push(missing);

        const result = analyzeOperations(new Map(), createCodePath(start, [end]));

        assert.strictEqual(result, true);
    });

    it('hasUnhandledReturnPath() ignores returned segments without exit state', function () {
        const start = createSegment('start');
        const missing = createSegment('missing');

        const result = analyzeOperations(new Map(), createCodePath(start, [missing]));

        assert.strictEqual(result, false);
    });

    it('hasUnhandledReturnPath() reuses unchanged loop state', function () {
        const start = createSegment('start');

        linkSegments(start, start);

        const result = analyzeOperations(
            new Map([
                ['start', [containerPropertyAssignment('obj', 'someFunc', identifier('done'))]]
            ]),
            createCodePath(start, [start])
        );

        assert.strictEqual(result, true);
    });

    it('haveSameTrackedBindings() detects different binding counts', function () {
        assert.strictEqual(haveSameTrackedBindings(new Set(['done']), new Set()), false);
        assert.strictEqual(haveSameTrackedBindings(new Set(['done']), new Set(['done', 'finish'])), false);
        assert.strictEqual(haveSameTrackedBindings(new Set(['done', 'finish']), new Set(['done', 'other'])), false);
    });

    it('haveSameTrackedContainerProperties() detects different tracked properties', function () {
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map()
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['other', new Set(['someFunc'])],
                    ['obj', new Set(['someFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['other', new Set(['someFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc'])]
                ]),
                new Map([
                    ['obj', new Set(['someFunc', 'otherFunc'])]
                ])
            ),
            false
        );
        assert.strictEqual(
            haveSameTrackedContainerProperties(
                new Map([
                    ['obj', new Set(['someFunc', 'otherFunc'])]
                ]),
                new Map([
                    ['obj', new Set(['someFunc', 'thirdFunc'])]
                ])
            ),
            false
        );
    });
});
