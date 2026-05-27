import { Linter, type Rule } from 'eslint';
import assert from 'node:assert';
import type { NameDetails } from '../mocha/name-details.js';
import { findMochaVariableCalls } from './find-mocha-variable-calls.js';

type ResolvedReferenceWithNameDetails = ReturnType<typeof findMochaVariableCalls>[number];

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
    } as Linter.Config);

    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return calls;
}

describe('findMochaVariableCalls() config calls', function () {
    it('adds both config and base-call references for chained config calls', function () {
        const calls = findCalls(
            'foo().timeout();',
            [
                {
                    path: ['foo'],
                    normalizedPath: ['foo()'],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: ['foo', 'timeout'],
                    normalizedPath: ['foo()', 'timeout()'],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(calls[0]?.path, ['foo()', 'timeout()']);
        assert.deepStrictEqual(calls[0]?.resolvedPath, ['foo()', 'timeout()']);
        assert.deepStrictEqual(calls[1]?.path, ['foo()']);
        assert.deepStrictEqual(calls[1]?.resolvedPath, ['foo()']);
    });

    it('does not add a base-call reference when only the config call is declared', function () {
        const calls = findCalls(
            'foo().timeout();',
            [
                {
                    path: ['foo', 'timeout'],
                    normalizedPath: ['foo()', 'timeout()'],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0]?.path, ['foo()', 'timeout()']);
        assert.deepStrictEqual(calls[0]?.resolvedPath, ['foo()', 'timeout()']);
    });

    it('does not add duplicate base references for non-config chained calls', function () {
        const calls = findCalls(
            'foo().bar();',
            [
                {
                    path: ['foo'],
                    normalizedPath: ['foo()'],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: ['foo', 'bar'],
                    normalizedPath: ['foo()', 'bar()'],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0]?.path, ['foo()', 'bar()']);
        assert.deepStrictEqual(calls[0]?.resolvedPath, ['foo()', 'bar()']);
    });

    it('preserves the full base path for nested config call references', function () {
        const calls = findCalls(
            'foo.bar().timeout();',
            [
                {
                    path: ['foo', 'bar'],
                    normalizedPath: ['foo', 'bar()'],
                    interface: 'BDD',
                    type: 'testCase',
                    config: null,
                    modifier: null
                },
                {
                    path: ['foo', 'bar', 'timeout'],
                    normalizedPath: ['foo', 'bar()', 'timeout()'],
                    interface: 'BDD',
                    type: 'config',
                    config: 'timeout',
                    modifier: null
                }
            ]
        );

        assert.strictEqual(calls.length, 2);
        const [configCall, baseCall] = calls;

        if (configCall === undefined || baseCall === undefined) {
            throw new Error('Expected config and base call references.');
        }

        assert.deepStrictEqual(configCall.path, ['foo', 'bar()', 'timeout()']);
        assert.deepStrictEqual(configCall.resolvedPath, ['foo', 'bar()', 'timeout()']);
        assert.strictEqual(configCall.name, 'foo.bar().timeout()');
        assert.deepStrictEqual(baseCall.path, ['foo', 'bar()']);
        assert.deepStrictEqual(baseCall.resolvedPath, ['foo', 'bar()']);
        assert.strictEqual(baseCall.name, 'foo.bar()');
    });
});
