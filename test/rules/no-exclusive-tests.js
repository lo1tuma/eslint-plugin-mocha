const { RuleTester } = require('eslint');
const { rules } = require('../../');
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected exclusive mocha test.';

ruleTester.run('no-exclusive-tests', rules['no-exclusive-tests'], {
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
        'var dynamicOnly = "only"; suite[dynamicOnly]()',
        'specify()',
        'specify.skip()',
        {
            code: 'a.b.c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interfaces: ['BDD'] }]
                }
            }
        },
        {
            code: 'a[b].c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interfaces: ['BDD'] }]
                }
            }
        },
        {
            code: 'a.b().c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b().c', type: 'testCase', interfaces: ['BDD'] }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe.only()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'describe["only"]()',
            errors: [{ message: expectedErrorMessage, column: 10, line: 1 }]
        },
        {
            code: 'it.only()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'it["only"]()',
            errors: [{ message: expectedErrorMessage, column: 4, line: 1 }]
        },
        {
            code: 'suite.only()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'suite["only"]()',
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'test.only()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'test["only"]()',
            errors: [{ message: expectedErrorMessage, column: 6, line: 1 }]
        },
        {
            code: 'context.only()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'context["only"]()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'specify.only()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'specify["only"]()',
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'custom.only()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["only"]()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'custom["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 8, line: 1 }]
        },
        {
            code: 'foo.bar.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'foo.bar["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'foo["bar"].only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 12, line: 1 }]
        },
        {
            code: 'foo["bar"]["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo.bar', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 12, line: 1 }]
        },
        {
            code: 'a.b.c.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'a.b.c', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 7, line: 1 }]
        },
        {
            code: 'this.it.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'this.it', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 9, line: 1 }]
        },
        {
            code: 'foo("bar").it.only()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo().it', type: 'testCase', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: expectedErrorMessage, column: 15, line: 1 }]
        }
    ]
});
