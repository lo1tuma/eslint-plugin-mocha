'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    expectedErrorMessage = 'Unexpected exclusive mocha test.';

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
        'var dynamicOnly = "only"; suite[dynamicOnly]()'
    ],

    invalid: [
        {
            code: 'describe.only()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
            output: 'describe()'
        },
        {
            code: 'describe["only"]()',
            errors: [ { message: expectedErrorMessage, column: 10, line: 1 } ],
            output: 'describe()'
        },
        {
            code: 'it.only()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
            output: 'it()'
        },
        {
            code: 'it["only"]()',
            errors: [ { message: expectedErrorMessage, column: 4, line: 1 } ],
            output: 'it()'
        },
        {
            code: 'suite.only()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
            output: 'suite()'
        },
        {
            code: 'suite["only"]()',
            errors: [ { message: expectedErrorMessage, column: 7, line: 1 } ],
            output: 'suite()'
        },
        {
            code: 'test.only()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
            output: 'test()'
        },
        {
            code: 'test["only"]()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ],
            output: 'test()'
        },
        {
            code: 'context.only()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
            output: 'context()'
        },
        {
            code: 'context["only"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ],
            output: 'context()'
        }
    ]

});
