import { RuleTester } from 'eslint';
import { noExclusiveTestsRule } from './no-exclusive-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected exclusive mocha test.';

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
            output: 'describe()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'describe["only"]()',
            output: 'describe()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'it.only()',
            output: 'it()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'import { it } from "mocha"; it.only()',
            output: 'import { it } from "mocha"; it()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{ message: expectedErrorMessage, column: 32, line: 1 }]
        },
        {
            code: 'import { it as foo } from "mocha"; foo.only()',
            output: 'import { it as foo } from "mocha"; foo()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{ message: expectedErrorMessage, column: 40, line: 1 }]
        },
        {
            code: 'import { it as foo } from "mocha"; const bar = foo; bar.only()',
            output: 'import { it as foo } from "mocha"; const bar = foo; bar()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'exports' } },
            errors: [{ message: expectedErrorMessage, column: 57, line: 1 }]
        },
        {
            code: 'it["only"]()',
            output: 'it()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'suite.only()',
            output: 'suite()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'suite["only"]()',
            output: 'suite()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'test.only()',
            output: 'test()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'test["only"]()',
            output: 'test()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'context.only()',
            output: 'context()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'context["only"]()',
            output: 'context()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'specify.only()',
            output: 'specify()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'specify["only"]()',
            output: 'specify()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'custom.only()',
            output: 'custom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["only"]()',
            output: 'custom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom.only()',
            output: 'custom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["only"]()',
            output: 'custom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'foo.bar.only()',
            output: 'foo.bar()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'foo.bar["only"]()',
            output: 'foo.bar()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'foo["bar"].only()',
            output: 'foo["bar"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 12, line: 1 }]
        },
        {
            code: 'foo["bar"]["only"]()',
            output: 'foo["bar"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 12, line: 1 }]
        },
        {
            code: 'a.b.c.only()',
            output: 'a.b.c()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        }
    ]
});
