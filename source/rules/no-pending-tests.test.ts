import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import { checkPendingSuite, checkPendingTestCase, noPendingTestsRule } from './no-pending-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected pending mocha test.';

function asRuleContext(ruleContext: Record<string, unknown>): Rule.RuleContext {
    return ruleContext as unknown as Rule.RuleContext;
}

function asRuleNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

ruleTester.run('no-pending-tests', noPendingTestsRule, {
    valid: [
        'it()',
        'it("should be false", function() { assert(something, false); })',
        'test()',
        'test("should be false", function() { assert(something, false); })',
        'specify()',
        'specify("should be false", function() { assert(something, false); })',
        'something.it()',
        'something.it("test")',
        'describe()',
        'describe.only()',
        'it.only()',
        'suite()',
        'suite.only()',
        'test.only()',
        'context()',
        'context.only()',
        'var appliedOnly = describe.skip; appliedOnly.apply(describe)',
        'var calledOnly = it.skip; calledOnly.call(it)',
        'var dynamicOnly = "ski"; dynamicOnly += String.fromCharCode(112); suite[dynamicOnly]()',
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'TDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'it("is pending")',
            output: null,
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test("is pending")',
            output: null,
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify("is pending")',
            output: null,
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'describe.skip()',
            output: 'describe()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'describe["skip"]()',
            output: 'describe()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'xdescribe()',
            output: 'describe()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it.skip()',
            output: 'it()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'it["skip"]()',
            output: 'it()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'xit()',
            output: 'it()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'suite.skip()',
            output: 'suite()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'suite["skip"]()',
            output: 'suite()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'test.skip()',
            output: 'test()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'test["skip"]()',
            output: 'test()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'context.skip()',
            output: 'context()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'context["skip"]()',
            output: 'context()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'xcontext()',
            output: 'context()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify.skip()',
            output: 'specify()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'xspecify()',
            output: 'specify()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom.skip()',
            output: 'custom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            output: 'custom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            output: 'custom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom.skip()',
            output: 'custom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            output: 'custom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            output: 'custom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'var dynamicOnly = "skip"; suite[dynamicOnly]()',
            output: null,
            errors: [{ message: expectedErrorMessage, column: 33, line: 1 }]
        }
    ]
});

describe('no-pending-tests helpers', function () {
    it('checkPendingTestCase() ignores non-call-expression nodes', function () {
        const reports: string[] = [];

        checkPendingTestCase(
            asRuleContext({
                report() {
                    reports.push('reported');
                }
            }),
            {
                modifier: null,
                node: asRuleNode({ type: 'Identifier' })
            }
        );

        assert.deepStrictEqual(reports, []);
    });

    it('checkPendingSuite() ignores non-call-expression nodes', function () {
        const reports: string[] = [];

        checkPendingSuite(
            asRuleContext({
                report() {
                    reports.push('reported');
                }
            }),
            {
                modifier: 'pending',
                node: asRuleNode({ type: 'Identifier' })
            }
        );

        assert.deepStrictEqual(reports, []);
    });
});
