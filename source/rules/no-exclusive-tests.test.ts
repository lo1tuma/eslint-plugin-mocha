import { type Rule, RuleTester, type SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    createExclusiveTestReportDescriptor,
    fixExclusiveTest,
    getExclusivePropertyNode,
    noExclusiveTestsRule
} from './no-exclusive-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected exclusive mocha test.';

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as unknown as SourceCode;
}

function asRuleFixer(fixer: Record<string, unknown>): Rule.RuleFixer {
    return fixer as unknown as Rule.RuleFixer;
}

function asRuleFix(fix: Record<string, unknown>): Rule.Fix {
    return fix as unknown as Rule.Fix;
}

function asRuleNode(node: Record<string, unknown>): Rule.Node {
    return node as unknown as Rule.Node;
}

ruleTester.run('no-exclusive-tests', noExclusiveTestsRule, {
    valid: [
        'describe()',
        'it()',
        'describe.skip()',
        'it.skip()',
        'suite()',
        'test()',
        'suite.skip()',
        'test.skip()',
        'context()',
        'context.skip()',
        'var appliedOnly = describe.only; appliedOnly.apply(describe)',
        'var calledOnly = it.only; calledOnly.call(it)',
        'var dynamicOnly = "onl"; dynamicOnly += "y"; suite[dynamicOnly]()',
        'function foo() { var it; it.only(); }',
        'specify()',
        'specify.skip()',
        {
            code: 'a.b.c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'a[b].c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'import { it} from "mocha"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import { it as foo } from "mocha"; foo.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'BDD' } }
        }
    ],

    invalid: [
        {
            code: 'describe.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'describe()' }]
            }]
        },
        {
            code: 'describe["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'describe()' }]
            }]
        },
        {
            code: 'it.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'it()' }]
            }]
        },
        {
            code: 'import { it } from "mocha"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{
                message: expectedErrorMessage,
                column: 32,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'import { it } from "mocha"; it()' }]
            }]
        },
        {
            code: 'import { it as foo } from "mocha"; foo.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{
                message: expectedErrorMessage,
                column: 40,
                line: 1,
                suggestions: [{
                    messageId: 'removeExclusiveModifier',
                    output: 'import { it as foo } from "mocha"; foo()'
                }]
            }]
        },
        {
            code: 'import { it as foo } from "mocha"; const bar = foo; bar.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{
                message: expectedErrorMessage,
                column: 57,
                line: 1,
                suggestions: [
                    {
                        messageId: 'removeExclusiveModifier',
                        output: 'import { it as foo } from "mocha"; const bar = foo; bar()'
                    }
                ]
            }]
        },
        {
            code: 'it["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'it()' }]
            }]
        },
        {
            code: 'suite.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'suite()' }]
            }]
        },
        {
            code: 'suite["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'suite()' }]
            }]
        },
        {
            code: 'test.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'test()' }]
            }]
        },
        {
            code: 'test["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'test()' }]
            }]
        },
        {
            code: 'context.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'context()' }]
            }]
        },
        {
            code: 'context["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'context()' }]
            }]
        },
        {
            code: 'specify.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'specify()' }]
            }]
        },
        {
            code: 'specify["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'specify()' }]
            }]
        },
        {
            code: 'custom.only()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom["only"]()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'foo.bar.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'foo.bar()' }]
            }]
        },
        {
            code: 'foo.bar["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'foo.bar()' }]
            }]
        },
        {
            code: 'foo["bar"].only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 12,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'foo["bar"]()' }]
            }]
        },
        {
            code: 'foo["bar"]["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 12,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'foo["bar"]()' }]
            }]
        },
        {
            code: 'a.b.c.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'a.b.c()' }]
            }]
        }
    ]
});

describe('no-exclusive-tests helpers', function () {
    it('fixExclusiveTest() returns null for non-call-expression nodes', function () {
        const result = fixExclusiveTest(
            asRuleFixer({}),
            asSourceCode({}),
            asRuleNode({ type: 'Identifier' })
        );

        assert.strictEqual(result, null);
    });

    it('fixExclusiveTest() returns null when the member-expression range is missing', function () {
        const result = fixExclusiveTest(
            asRuleFixer({
                replaceTextRange() {
                    return asRuleFix({});
                }
            }),
            asSourceCode({
                getText() {
                    return 'describe';
                }
            }),
            asRuleNode({
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    range: undefined
                }
            })
        );

        assert.strictEqual(result, null);
    });

    it('getExclusivePropertyNode() returns null for non-call-expression nodes', function () {
        const result = getExclusivePropertyNode(asRuleNode({ type: 'Identifier' }));

        assert.strictEqual(result, null);
    });

    it('createExclusiveTestReportDescriptor() falls back to the call-expression location', function () {
        const node = asRuleNode({ type: 'CallExpression' });
        const exclusivePropertyNode = asRuleNode({
            type: 'Identifier',
            loc: undefined
        });
        const result = createExclusiveTestReportDescriptor(node, exclusivePropertyNode as never);

        assert.deepStrictEqual(result, {
            node,
            messageId: 'unexpectedExclusiveTest'
        });
    });
});
