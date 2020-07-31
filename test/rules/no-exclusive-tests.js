'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();
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
                    additionalCustomNames: { exclusiveTestCases: [ 'a.b.c.only' ] }
                }
            }
        },
        {
            code: 'a[b].c.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'a.b.c.only' ] }
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe.only()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ]
        },
        {
            code: 'describe["only"]()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ]
        },
        {
            code: 'it.only()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ]
        },
        {
            code: 'it["only"]()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ]
        },
        {
            code: 'suite.only()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ]
        },
        {
            code: 'suite["only"]()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ]
        },
        {
            code: 'test.only()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ]
        },
        {
            code: 'test["only"]()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ]
        },
        {
            code: 'context.only()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'context["only"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'specify.only()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'specify["only"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'custom.only()',
            settings: {
                'mocha/additionalCustomNames': { exclusiveTestCases: [ 'custom.only' ] }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        },
        {
            code: 'custom["only"]()',
            settings: {
                'mocha/additionalCustomNames': { exclusiveTestCases: [ 'custom.only' ] }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        },
        {
            code: 'custom.only()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'custom.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        },
        {
            code: 'custom["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'custom.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        },
        {
            code: 'foo.bar.only()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'foo.bar.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'foo.bar["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'foo.bar.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'foo["bar"].only()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'foo.bar.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 12, line: 1 } ]
        },
        {
            code: 'foo["bar"]["only"]()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'foo.bar.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 12, line: 1 } ]
        },
        {
            code: 'a.b.c.only()',
            settings: {
                mocha: {
                    additionalCustomNames: { exclusiveTestCases: [ 'a.b.c.only' ] }
                }
            },
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ]
        }
    ]
});
