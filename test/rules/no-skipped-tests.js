'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();
const expectedErrorMessage = 'Unexpected skipped mocha test.';

ruleTester.run('no-skipped-tests', rules['no-skipped-tests'], {

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
        'var dynamicOnly = "skip"; suite[dynamicOnly]()'
    ],

    invalid: [
        {
            code: 'describe.skip()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
        },
        {
            code: 'describe["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
        },
        {
            code: 'xdescribe()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        },
        {
            code: 'it.skip()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
        },
        {
            code: 'it["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
        },
        {
            code: 'xit()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        },
        {
            code: 'suite.skip()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
        },
        {
            code: 'suite["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
        },
        {
            code: 'test.skip()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
        },
        {
            code: 'test["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
        },
        {
            code: 'context.skip()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
        },
        {
            code: 'context["skip"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
        },
        {
            code: 'xcontext()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        },
        {
            code: 'specify.skip()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
        },
        {
            code: 'xspecify()',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        },
        {
            code: 'custom.skip()',
            settings: {
                'mocha/additionalTestFunctions': [ 'custom' ]
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ],
        },
        {
            code: 'custom["skip"]()',
            settings: {
                'mocha/additionalTestFunctions': [ 'custom' ]
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ],
        },
        {
            code: 'xcustom()',
            settings: {
                'mocha/additionalXFunctions': [ 'xcustom' ]
            },
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        },
        {
            code: 'custom.skip()',
            settings: {
                mocha: {
                    additionalTestFunctions: [ 'custom' ]
                }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ],
        },
        {
            code: 'custom["skip"]()',
            settings: {
                mocha: {
                    additionalTestFunctions: [ 'custom' ]
                }
            },
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ],
        },
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalXFunctions: [ 'xcustom' ]
                }
            },
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ],
        }

    ]

});

