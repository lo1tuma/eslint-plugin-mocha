import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import { suite, test } from 'mocha';
import type { NameDetails } from '../mocha/name-details.ts';
import { findMochaVariableCalls } from './find-mocha-variable-calls.ts';

type ResolvedReferenceWithNameDetails = ReturnType<typeof findMochaVariableCalls>[number];

function getCall(
    calls: readonly ResolvedReferenceWithNameDetails[],
    index: number
): ResolvedReferenceWithNameDetails {
    const call = calls[index];

    if (call === undefined) {
        throw new Error('Expected call to exist.');
    }
    return call;
}

function expectTwoCalls(
    calls: readonly ResolvedReferenceWithNameDetails[]
): readonly [ResolvedReferenceWithNameDetails, ResolvedReferenceWithNameDetails] {
    assert.strictEqual(calls.length, 2);
    const [ firstCall, secondCall ] = calls;

    if (firstCall === undefined || secondCall === undefined) {
        throw new Error('Expected two call references.');
    }

    return [ firstCall, secondCall ];
}

function findCalls(
    code: string,
    names: readonly Partial<NameDetails>[],
    interfaceToUse: 'BDD' | 'require' | 'TDD' = 'BDD'
): readonly ResolvedReferenceWithNameDetails[] {
    const linter = new Linter();
    let calls: readonly ResolvedReferenceWithNameDetails[] = [];

    const testLintRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                'Program:exit'() {
                    calls = findMochaVariableCalls(
                        ruleContext,
                        names as readonly NameDetails[],
                        interfaceToUse,
                        false
                    );
                }
            };
        }
    };

    const results = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testLintRule } } },
        languageOptions: { ecmaVersion: 2018, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });

    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return calls;
}

suite('findMochaVariableCalls() config calls', function () {
    test('adds both config and base-call references for chained config calls', function () {
        const calls = findCalls(
            'foo().timeout();',
            [
                {
                    path: [ 'foo' ],
                    normalizedPath: [ 'foo()' ],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: [ 'foo', 'timeout' ],
                    normalizedPath: [ 'foo()', 'timeout()' ],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()', 'timeout()' ]);
        assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()', 'timeout()' ]);
        assert.deepStrictEqual(getCall(calls, 1).path, [ 'foo()' ]);
        assert.deepStrictEqual(getCall(calls, 1).resolvedPath, [ 'foo()' ]);
    });

    test('does not add a base-call reference when only the config call is declared', function () {
        const calls = findCalls(
            'foo().timeout();',
            [
                {
                    path: [ 'foo', 'timeout' ],
                    normalizedPath: [ 'foo()', 'timeout()' ],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()', 'timeout()' ]);
        assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()', 'timeout()' ]);
    });

    test('does not add duplicate base references for non-config chained calls', function () {
        const calls = findCalls(
            'foo().bar();',
            [
                {
                    path: [ 'foo' ],
                    normalizedPath: [ 'foo()' ],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: [ 'foo', 'bar' ],
                    normalizedPath: [ 'foo()', 'bar()' ],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()', 'bar()' ]);
        assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()', 'bar()' ]);
    });

    test('preserves the full base path for nested config call references', function () {
        const calls = findCalls(
            'foo.bar().timeout();',
            [
                {
                    path: [ 'foo', 'bar' ],
                    normalizedPath: [ 'foo', 'bar()' ],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: [ 'foo', 'bar', 'timeout' ],
                    normalizedPath: [ 'foo', 'bar()', 'timeout()' ],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        const [ configCall, baseCall ] = expectTwoCalls(calls);

        assert.deepStrictEqual(
            {
                path: configCall.path,
                resolvedPath: configCall.resolvedPath,
                name: configCall.name
            },
            {
                path: [ 'foo', 'bar()', 'timeout()' ],
                resolvedPath: [ 'foo', 'bar()', 'timeout()' ],
                name: 'foo.bar().timeout()'
            }
        );
        assert.deepStrictEqual(
            {
                path: baseCall.path,
                resolvedPath: baseCall.resolvedPath,
                name: baseCall.name
            },
            {
                path: [ 'foo', 'bar()' ],
                resolvedPath: [ 'foo', 'bar()' ],
                name: 'foo.bar()'
            }
        );
    });
});
