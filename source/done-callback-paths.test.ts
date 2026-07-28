import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import {
    analyzeOperations,
    bindingAssignment,
    callbackHandoff,
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
    privateIdentifier,
    property,
    readSegment,
    spreadElement
} from './done-callback-paths.test-support.ts';
import {
    getMemberExpressionBindingAndProperty
} from './tracked-callback-reference-state.ts';

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

function failUnexpectedTraversal(): void {
    throw new Error('Unexpected traversal.');
}

suite('done callback path helpers', function () {
    suite('fixtures', function () {
        test('readSegment() throws for unknown segment ids', function () {
            assert.throws(
                function readMissingSegment() {
                    readSegment(createSegmentGraph([ 'start' ], []), 'missing');
                },
                {
                    message: 'Expected segment "missing".'
                }
            );
        });

        test('createCodePath() does not support segment traversal', function () {
            const segment = createSegment('start');
            const codePath = createCodePath(segment, [ segment ]);

            assert.throws(
                function traverseCodePath() {
                    codePath.traverseSegments(failUnexpectedTraversal);
                },
                {
                    message: 'Code path traversal is not supported by this fixture.'
                }
            );
        });
    });

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
        test('hasUnhandledReturnPath() treats handled callback arguments as callback handoffs', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([ [ 'start', [ callbackHandoff(identifier('callbackArgument')) ] ] ]),
                createCodePath(start, [ start ])
            );

            assert.strictEqual(result, false);
        });

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

        test('hasUnhandledReturnPath() clears container properties on binding reassignment', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('obj', 'someFunc', identifier('done')),
                            bindingAssignment('obj', objectExpression([])),
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

        test('hasUnhandledReturnPath() preserves unrelated container properties on binding reassignment', function () {
            const start = createSegment('start');

            const result = analyzeOperations(
                new Map([
                    [
                        'start',
                        [
                            containerPropertyAssignment('obj', 'someFunc', identifier('done')),
                            containerPropertyAssignment('otherObj', 'someFunc', identifier('done')),
                            bindingAssignment('obj', objectExpression([])),
                            callOperation(identifier('foo'), [
                                memberExpression(identifier('otherObj'), identifier('someFunc'))
                            ])
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
});
