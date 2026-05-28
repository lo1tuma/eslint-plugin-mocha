import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noExclusiveTestsRule } from './no-exclusive-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected exclusive mocha test.';

ruleTester.run('no-exclusive-tests', noExclusiveTestsRule, {
    valid: [
        'describe()',
        'it()',
        'describe.skip()',
        'it.skip()',
        withInterface('TDD', 'suite()'),
        withInterface('TDD', 'test()'),
        withInterface('TDD', 'suite.skip()'),
        withInterface('TDD', 'test.skip()'),
        'context()',
        'context.skip()',
        'var appliedOnly = describe.only; appliedOnly.apply(describe)',
        'var calledOnly = it.only; calledOnly.call(it)',
        withInterface('TDD', 'var dynamicOnly = "onl"; dynamicOnly += "y"; suite[dynamicOnly]()'),
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
        },
        {
            code: 'import { it } from "../helpers.js"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'require' } }
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
            settings: { mocha: { interface: 'require' } },
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
            settings: { mocha: { interface: 'require' } },
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
            settings: { mocha: { interface: 'require' } },
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
        withInterface('TDD', {
            code: 'suite.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'suite()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'suite["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'suite()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'test.only()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'test()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'test["only"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removeExclusiveModifier', output: 'test()' }]
            }]
        }),
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
        },
        {
            code: 'import { custom } from "../helpers.js"; custom.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'require' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 48,
                line: 1,
                suggestions: [{
                    messageId: 'removeExclusiveModifier',
                    output: 'import { custom } from "../helpers.js"; custom()'
                }]
            }]
        }
    ]
});
