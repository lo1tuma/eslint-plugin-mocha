import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import {
    analyzeOperations,
    bindingAssignment,
    callOperation,
    containerPropertyAssignment,
    createCodePath,
    createSegment,
    createSegmentGraph,
    identifier,
    type ObjectExpressionNode,
    readSegment
} from './done-callback-paths.test-support.ts';

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

suite('done callback code path helpers', function () {
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
