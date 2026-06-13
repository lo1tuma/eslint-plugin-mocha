import assert from 'node:assert';
import { Linter, type Rule, RuleTester, type SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { consistentStructureRule } from './consistent-structure.js';
import { getTopLevelMochaExpression } from './direct-mocha-statement.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

type ReadExpressionResult = {
    readonly sourceCode: Readonly<SourceCode>;
    readonly expression: Readonly<Rule.Node>;
};

function readExpression(
    code: string
): ReadExpressionResult {
    const linter = new Linter();
    let result: ReadExpressionResult | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [ firstStatement ] = ruleContext.sourceCode.ast.body;

                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');

                    result = {
                        sourceCode: ruleContext.sourceCode,
                        expression: firstStatement.expression as unknown as Readonly<Rule.Node>
                    };
                }
            };
        }
    };

    const messages = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testRule } } },
        languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });

    assert.deepStrictEqual(messages, []);
    assert.notStrictEqual(result, null);

    return result as unknown as {
        readonly sourceCode: Readonly<SourceCode>;
        readonly expression: Readonly<Rule.Node>;
    };
}

ruleTester.run('consistent-structure', consistentStructureRule, {
    valid: [
        'describe(function() { before(function() {}); it(function() {}); describe(function() {}); });',
        'describe(function() { before(function() {}); beforeEach(function() {}); it(function() {}); });',
        'describe(function() { after(function() {}); });',
        'describe(function() { describe(function() {}); describe(function() {}); });',
        'describe(function() { it(function() {}); it(function() {}); });',
        'describe(function() { before(function() {}); before(function() {}); });',
        {
            code:
                'describe(function() { before(function() {}); beforeEach(function() {}); afterEach(function() {}); after(function() {}); });',
            options: [ { hookOrder: 'setup-teardown' } ],
            name: 'valid case 1'
        },
        {
            code: 'before(function() {}); beforeEach(function() {}); afterEach(function() {}); after(function() {});',
            options: [ { hookOrder: 'setup-teardown' } ],
            name: 'valid case 2'
        },
        {
            code: 'describe(function() { around(function() {}); before(function() {}); });',
            options: [ { hookOrder: 'setup-teardown' } ],
            name: 'valid case 3',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'around', type: 'hook', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [ { order: 'hooks-tests-suites' } ],
            name: 'valid case 4'
        },
        {
            code: 'describe(function() { before(function() {}); it(function() {}); });',
            options: [ { order: 'hooks-tests-suites' } ],
            name: 'valid case 5'
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [ { disallowMixedTestsAndSuites: false } ],
            name: 'valid case 6'
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [ { order: 'off', disallowMixedTestsAndSuites: false } ],
            name: 'valid case 7'
        },
        withInterface('TDD', {
            code: 'suite(function() { setup(function() {}); suite(function() {}); suite(function() {}); });',
            options: [ { order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true } ]
        }),
        withInterface('TDD', {
            code: [
                'suite(function() {',
                '    suiteSetup(function() {});',
                '    setup(function() {});',
                '    teardown(function() {});',
                '    suiteTeardown(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { hookOrder: 'setup-teardown' } ]
        }),
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true } ],
            name: 'valid case 8',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'describe(function() {',
                '    forEach([ 1 ]).before(function() {});',
                '    forEach([ 1 ]).beforeEach(function() {});',
                '    forEach([ 1 ]).afterEach(function() {});',
                '    forEach([ 1 ]).after(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { hookOrder: 'setup-teardown' } ],
            name: 'valid case 9',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().before', type: 'hook', interface: 'BDD' },
                        { name: 'forEach().beforeEach', type: 'hook', interface: 'BDD' },
                        { name: 'forEach().afterEach', type: 'hook', interface: 'BDD' },
                        { name: 'forEach().after', type: 'hook', interface: 'BDD' }
                    ]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe(function() { it(function() {}); before(function() {}); });',
            options: [ { order: 'hooks-tests-suites' } ],
            errors: [ {
                message: 'Unexpected hook after a test case.',
                column: 42,
                line: 1,
                endLine: 1,
                endColumn: 63
            } ],
            name: 'invalid case 1'
        },
        {
            code: 'describe(function() { describe(function() {}); before(function() {}); });',
            options: [ { order: 'hooks-tests-suites' } ],
            errors: [ {
                message: 'Unexpected hook after a child suite.',
                column: 48,
                line: 1,
                endLine: 1,
                endColumn: 69
            } ],
            name: 'invalid case 2'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); before(function() {}); });',
            options: [ { hookOrder: 'setup-teardown' } ],
            errors: [ {
                message: 'Unexpected Mocha `before()` hook after `beforeEach()` hook.',
                column: 50,
                line: 1,
                endLine: 1,
                endColumn: 71
            } ],
            name: 'invalid case 3'
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [ { order: 'hooks-tests-suites' } ],
            errors: [ {
                message: 'Unexpected test case after a child suite.',
                column: 48,
                line: 1,
                endLine: 1,
                endColumn: 65
            } ],
            name: 'invalid case 4'
        },
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [ { disallowMixedTestsAndSuites: true } ],
            errors: [ {
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 42,
                line: 1,
                endLine: 1,
                endColumn: 65
            } ],
            name: 'invalid case 5'
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [ { disallowMixedTestsAndSuites: true } ],
            errors: [ {
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 48,
                line: 1,
                endLine: 1,
                endColumn: 65
            } ],
            name: 'invalid case 6'
        },
        {
            code: [
                'describe(function() {',
                '    describe(function() {});',
                '    it(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true } ],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 5, line: 3, endLine: 3, endColumn: 22 },

                {
                    message: 'Unexpected mix of test cases and child suites at the same level.',
                    column: 5,
                    line: 3,
                    endLine: 3,
                    endColumn: 22
                },
                { message: 'Unexpected test case after a child suite.', column: 5, line: 4, endLine: 4, endColumn: 22 }
            ],
            name: 'invalid case 7'
        },
        withInterface('TDD', {
            code: 'suite(function() { suite(function() {}); test(function() {}); });',
            options: [ { order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true } ],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 42, line: 1 },
                { message: 'Unexpected mix of test cases and child suites at the same level.', column: 42, line: 1 }
            ]
        }),
        withInterface('TDD', {
            code: 'suite(function() { teardown(function() {}); setup(function() {}); });',
            options: [ { hookOrder: 'setup-teardown' } ],
            errors: [ {
                message: 'Unexpected Mocha `setup()` hook after `teardown()` hook.',
                column: 45,
                line: 1
            } ]
        }),
        {
            code: [
                'foo(function() {',
                '    it(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { disallowMixedTestsAndSuites: true } ],
            errors: [ {
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 5,
                line: 3,
                endLine: 3,
                endColumn: 23
            } ],
            name: 'invalid case 8',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'describe(function() {',
                '    forEach([ 1 ]).afterEach(function() {});',
                '    forEach([ 1 ]).beforeEach(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { hookOrder: 'setup-teardown' } ],
            errors: [ {
                message: 'Unexpected Mocha `forEach().beforeEach()` hook after `forEach().afterEach()` hook.',
                column: 5,
                line: 3,
                endLine: 3,
                endColumn: 45
            } ],
            name: 'invalid case 9',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().beforeEach', type: 'hook', interface: 'BDD' },
                        { name: 'forEach().afterEach', type: 'hook', interface: 'BDD' }
                    ]
                }
            }
        }
    ]
});

suite('consistent-structure helpers', function () {
    test('exposes the expected default options', function () {
        assert.deepStrictEqual(consistentStructureRule.meta?.defaultOptions, [ {
            disallowDuplicateHooks: false,
            hookOrder: 'off',
            order: 'off',
            disallowMixedTestsAndSuites: false
        } ]);
    });

    test('getTopLevelMochaExpression() walks up member expressions', function () {
        const { expression } = readExpression('foo.bar.baz();');

        assert.strictEqual(expression.type, 'CallExpression');
        assert.strictEqual(expression.callee.type, 'MemberExpression');
        assert.strictEqual(expression.callee.object.type, 'MemberExpression');

        const result = getTopLevelMochaExpression(expression.callee.object.object as unknown as Rule.Node);

        assert.strictEqual(result.type, 'MemberExpression');
        assert.strictEqual(result, expression.callee);
    });
});
