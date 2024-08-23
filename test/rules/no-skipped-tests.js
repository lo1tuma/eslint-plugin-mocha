import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected skipped mocha test.';

ruleTester.run('no-skipped-tests', plugin.rules['no-skipped-tests'], {
    valid: [
        'describe()',
        'it()',
        'describe.only()',
        'it.only()',
        'suite()',
        'test()',
        'suite.only()',
        'test.only()',
        'context()',
        'context.only()',
        'var appliedOnly = describe.skip; appliedOnly.apply(describe)',
        'var calledOnly = it.skip; calledOnly.call(it)',
        'var dynamicOnly = "skip"; suite[dynamicOnly]()',
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['TDD'] }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe.skip()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'describe["skip"]()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'xdescribe()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it.skip()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'it["skip"]()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'xit()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'suite.skip()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'suite["skip"]()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'test.skip()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'test["skip"]()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'context.skip()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'context["skip"]()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'xcontext()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify.skip()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'xspecify()',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom.skip()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom("bar").it.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom().it', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 18, line: 1 }]
        }
    ]
});
