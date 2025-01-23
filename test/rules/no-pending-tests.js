import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected pending mocha test.';

ruleTester.run('no-pending-tests', plugin.rules['no-pending-tests'], {
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
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: ['TDD'] }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'it("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
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
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'custom.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'var dynamicOnly = "skip"; suite[dynamicOnly]()',
            errors: [{ message: expectedErrorMessage, column: 33, line: 1 }]
        }
    ]
});
