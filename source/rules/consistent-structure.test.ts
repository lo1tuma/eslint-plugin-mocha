import { Linter, type Rule, RuleTester, type SourceCode } from 'eslint';
import assert from 'node:assert';
import { withInterface } from '../mocha-interface-test-cases.js';
import {
    consistentStructureRule,
    getDirectStructureContext,
    getStructureEntityKind,
    getTopLevelMochaExpression,
    isNestedStatementBoundary
} from './consistent-structure.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

function readExpression(code: string): { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } {
    const linter = new Linter();
    let result: { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [firstStatement] = ruleContext.sourceCode.ast.body;

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

    return result as unknown as { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; };
}

function readSuiteBodyNodes(
    code: string
): { nestedMochaCall: Readonly<Rule.Node>; suiteBody: Readonly<Rule.Node>; } {
    const linter = new Linter();
    let result: { nestedMochaCall: Readonly<Rule.Node>; suiteBody: Readonly<Rule.Node>; } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [firstStatement] = ruleContext.sourceCode.ast.body;

                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');
                    assert.strictEqual(firstStatement.expression.type, 'CallExpression');

                    const suiteCallback = firstStatement.expression.arguments[0];

                    assert.notStrictEqual(suiteCallback, undefined);
                    assert.strictEqual(suiteCallback?.type, 'FunctionExpression');

                    const [nestedStatement] = suiteCallback.body.body;

                    assert.notStrictEqual(nestedStatement, undefined);
                    assert.strictEqual(nestedStatement?.type, 'IfStatement');
                    assert.strictEqual(nestedStatement.consequent.type, 'BlockStatement');
                    assert.strictEqual(nestedStatement.consequent.body[0]?.type, 'ExpressionStatement');

                    result = {
                        nestedMochaCall: nestedStatement.consequent.body[0].expression as unknown as Readonly<
                            Rule.Node
                        >,
                        suiteBody: suiteCallback.body as unknown as Readonly<Rule.Node>
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

    return result as unknown as { nestedMochaCall: Readonly<Rule.Node>; suiteBody: Readonly<Rule.Node>; };
}

ruleTester.run('consistent-structure', consistentStructureRule, {
    valid: [
        'describe(function() { before(function() {}); it(function() {}); describe(function() {}); });',
        'describe(function() { before(function() {}); beforeEach(function() {}); it(function() {}); });',
        'describe(function() { after(function() {}); });',
        'describe(function() { describe(function() {}); describe(function() {}); });',
        'describe(function() { it(function() {}); it(function() {}); });',
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: false }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ order: 'off', disallowMixedTestsAndSuites: false }]
        },
        withInterface('TDD', {
            code: 'suite(function() { setup(function() {}); suite(function() {}); suite(function() {}); });',
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }]
        }),
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe(function() { it(function() {}); before(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected hook after a test case.', column: 42, line: 1 }]
        },
        {
            code: 'describe(function() { describe(function() {}); before(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected hook after a child suite.', column: 48, line: 1 }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected test case after a child suite.', column: 48, line: 1 }]
        },
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: true }],
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 42,
                line: 1
            }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: true }],
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 48,
                line: 1
            }]
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
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 5, line: 3 },
                { message: 'Unexpected mix of test cases and child suites at the same level.', column: 5, line: 3 },
                { message: 'Unexpected test case after a child suite.', column: 5, line: 4 }
            ]
        },
        withInterface('TDD', {
            code: 'suite(function() { suite(function() {}); test(function() {}); });',
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 42, line: 1 },
                { message: 'Unexpected mix of test cases and child suites at the same level.', column: 42, line: 1 }
            ]
        }),
        {
            code: [
                'foo(function() {',
                '    it(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ disallowMixedTestsAndSuites: true }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 5,
                line: 3
            }]
        }
    ]
});

describe('consistent-structure helpers', function () {
    it('getTopLevelMochaExpression() walks up member expressions', function () {
        const { expression } = readExpression('foo.bar.baz();');

        assert.strictEqual(expression.type, 'CallExpression');
        assert.strictEqual(expression.callee.type, 'MemberExpression');
        assert.strictEqual(expression.callee.object.type, 'MemberExpression');

        const result = getTopLevelMochaExpression(expression.callee.object.object as unknown as Rule.Node);

        assert.strictEqual(result.type, 'MemberExpression');
        assert.strictEqual(result, expression.callee);
    });

    it('getStructureEntityKind() throws for unsupported mocha entities', function () {
        const { expression: node } = readExpression('foo;');

        assert.throws(
            function () {
                getStructureEntityKind({
                    interface: 'BDD',
                    modifier: null,
                    name: 'timeout',
                    node,
                    type: 'config'
                });
            },
            /Unexpected mocha entity type: config/u
        );
    });

    it('getDirectStructureContext() returns null when no structure layer exists', function () {
        const { expression: node } = readExpression('foo;');
        const result = getDirectStructureContext([], {
            interface: 'BDD',
            modifier: null,
            name: 'describe',
            node,
            type: 'suite'
        });

        assert.strictEqual(result, null);
    });

    it('isNestedStatementBoundary() handles declarations, functions, and unrelated nodes', function () {
        assert.strictEqual(isNestedStatementBoundary({ type: 'ImportDeclaration' } as Rule.Node), true);
        assert.strictEqual(isNestedStatementBoundary({ type: 'FunctionExpression' } as Rule.Node), true);
        assert.strictEqual(isNestedStatementBoundary({ type: 'Identifier' } as Rule.Node), false);
    });

    it('getDirectStructureContext() returns null for nested statements inside a suite body', function () {
        const { nestedMochaCall, suiteBody } = readSuiteBodyNodes('describe(function () { if (foo) { it(); } });');
        const result = getDirectStructureContext(
            [{
                hasReportedMixedStructure: false,
                hasSeenSuite: false,
                hasSeenTestCase: false,
                highestSeenKind: null,
                scopeNode: suiteBody as never
            }],
            {
                interface: 'BDD',
                modifier: null,
                name: 'it',
                node: nestedMochaCall,
                type: 'testCase'
            }
        );

        assert.strictEqual(result, null);
    });
});
