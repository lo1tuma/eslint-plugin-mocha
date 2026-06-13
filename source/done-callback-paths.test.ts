import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import {
    analyzeOperations,
    bindingAssignment,
    callExpression,
    callOperation,
    containerPropertyAssignment,
    createCodePath,
    createSegment,
    createSegmentGraph,
    createSourceCode,
    createThreeBranchCodePath,
    identifier,
    literal,
    memberExpression,
    objectExpression,
    type ObjectExpressionNode,
    privateIdentifier,
    property,
    readSegment,
    spreadElement
} from './done-callback-paths.test-support.js';
import {
    getMemberExpressionBindingAndProperty
} from './tracked-callback-reference-state.js';

function createTwoBranchCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'left', 'right', 'end' ],
        [
            [ 'start', 'left' ],
            [ 'start', 'right' ],
            [ 'left', 'end' ],
            [ 'right', 'end' ]
        ]
    );

    return createCodePath(readSegment(segments, 'start'), [ readSegment(segments, 'end') ]);
}

function createLinearCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'end' ],
        [ [ 'start', 'end' ] ]
    );

    return createCodePath(readSegment(segments, 'start'), [ readSegment(segments, 'end') ]);
}

function createMissingPredecessorCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'missing', 'end' ],
        [
            [ 'start', 'end' ],
            [ 'missing', 'end' ]
        ]
    );

    return createCodePath(readSegment(segments, 'start'), [ readSegment(segments, 'end') ]);
}

function createLoopCodePath(): Rule.CodePath {
    const start = readSegment(
        createSegmentGraph([ 'start' ], [ [ 'start', 'start' ] ]),
        'start'
    );

    return createCodePath(start, [ start ]);
}

function createConvergingLoopCodePath(): Rule.CodePath {
    const segments = createSegmentGraph(
        [ 'start', 'loop', 'end' ],
        [
            [ 'start', 'loop' ],
            [ 'loop', 'loop' ],
            [ 'loop', 'end' ]
        ]
    );

    return createCodePath(readSegment(segments, 'start'), [ readSegment(segments, 'end') ]);
}

suite('done callback path helpers', function () {
    suite('member expressions', function () {
        test('getMemberExpressionBindingAndProperty() resolves static and computed properties', function () {
            const sourceCode = createSourceCode();

            assert.deepStrictEqual(
                getMemberExpressionBindingAndProperty(
                    sourceCode,
                    memberExpression(identifier('obj'), identifier('done'))
                ),
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
    });

    suite('branch state', function () {
        test('hasUnhandledReturnPath() keeps aliases shared by every branch', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ bindingAssignment('next', identifier('done')) ] ],
                    [ 'right', [ bindingAssignment('next', identifier('done')) ] ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('next') ]) ] ]
                ]),
                createTwoBranchCodePath()
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() drops aliases missing from one branch', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ bindingAssignment('next', identifier('done')) ] ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('next') ]) ] ]
                ]),
                createTwoBranchCodePath()
            );

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() stops processing later operations after a callback has been handled', function () {
            const result = analyzeOperations(
                new Map([ [
                    'end',
                    [
                        callOperation(identifier('foo'), [ identifier('done') ]),
                        bindingAssignment('next', identifier('done'))
                    ]
                ] ]),
                createLinearCodePath()
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() keeps shared container properties across branches', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ],
                    [ 'right', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('obj') ]) ] ]
                ]),
                createTwoBranchCodePath()
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() drops container properties when branches diverge', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ],
                    [ 'right', [ containerPropertyAssignment('obj', 'otherFunc', identifier('done')) ] ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('obj') ]) ] ]
                ]),
                createTwoBranchCodePath()
            );

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() drops container properties missing from any branch', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'left', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ],
                    [ 'middle', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('obj') ]) ] ]
                ]),
                createThreeBranchCodePath()
            );

            assert.strictEqual(result, true);
        });
    });

    suite('callback containers', function () {
        test('hasUnhandledReturnPath() handles inline callback containers with static keys', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            callOperation(identifier('foo'), [
                                objectExpression([ property(literal('someFunc'), identifier('done')) ])
                            ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() ignores spread elements in callback containers', function () {
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
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() ignores inline callback containers with dynamic keys', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            callOperation(identifier('foo'), [
                                objectExpression([ property(identifier('someFunc'), identifier('done'), true) ])
                            ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() tracks and clears dynamic container properties', function () {
            const start = createSegment('start');

            const trackedResult = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('obj', undefined, identifier('done')),
                            callOperation(identifier('foo'), [
                                memberExpression(identifier('obj'), identifier('key'), true)
                            ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );
            const clearedResult = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('obj', undefined, identifier('done')),
                            containerPropertyAssignment('obj', undefined, null),
                            callOperation(identifier('foo'), [
                                memberExpression(identifier('obj'), identifier('key'), true)
                            ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(trackedResult, false);
            assert.strictEqual(clearedResult, true);
        });

        test('hasUnhandledReturnPath() preserves remaining container properties on targeted reassignment', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('obj', 'someFunc', identifier('done')),
                            containerPropertyAssignment('obj', 'otherFunc', identifier('done')),
                            containerPropertyAssignment('obj', 'someFunc', null),
                            callOperation(identifier('foo'), [ identifier('obj') ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() treats spread callback handoffs as handled', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            callOperation(identifier('foo'), [ spreadElement(identifier('done')) ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() ignores untracked property handoffs', function () {
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
                            callOperation(identifier('foo'), [
                                memberExpression(identifier('obj'), identifier('someFunc'))
                            ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, true);
        });
    });

    suite('code paths', function () {
        test('hasUnhandledReturnPath() treats missing predecessor states as handled', function () {
            const result = analyzeOperations(new Map(), createMissingPredecessorCodePath());

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() ignores returned segments without exit state', function () {
            const start = createSegment('start');
            const missing = createSegment('missing');

            const result = analyzeOperations(new Map(), createCodePath(start, [ missing ]));

            assert.strictEqual(result, false);
        });

        test('hasUnhandledReturnPath() reuses unchanged loop state', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'start', [ containerPropertyAssignment('obj', 'someFunc', identifier('done')) ] ]
                ]),
                createLoopCodePath()
            );

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() revisits loops until aliased callback state stabilizes', function () {
            const result = analyzeOperations(
                new Map([
                    [ 'start', [ bindingAssignment('next', identifier('done')) ] ],
                    [
                        'loop',
                        [
                            bindingAssignment('later', identifier('next')),
                            bindingAssignment('next', null)
                        ]
                    ],
                    [ 'end', [ callOperation(identifier('foo'), [ identifier('later') ]) ] ]
                ]),
                createConvergingLoopCodePath()
            );

            assert.strictEqual(result, true);
        });

        test('hasUnhandledReturnPath() ignores getter-based callback container properties', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            callOperation(identifier('foo'), [ {
                                properties: [ {
                                    computed: false,
                                    key: identifier('someFunc'),
                                    kind: 'get',
                                    type: 'Property',
                                    value: identifier('done')
                                } ],
                                type: 'ObjectExpression'
                            } as unknown as ObjectExpressionNode ])
                        ]
                    ]
                ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, true);
        });
    });
});
