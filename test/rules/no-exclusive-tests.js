'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    expectedErrorMessage = 'Unexpected exclusive mocha test.';

ruleTester.run('no-exclusive-tests', rules['no-exclusive-tests'], {

    valid: [
        'describe()',
        'describeComponent()',
        'describeModel()',
        'describeModule()',
        'it()',
        'describe.skip()',
        'describeComponent.skip()',
        'describeModel.skip()',
        'describeModule.skip()',
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
        'specify.skip()'
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
            code: 'describeComponent.only()',
            errors: [ { message: expectedErrorMessage, column: 19, line: 1 } ]
        },
        {
            code: 'describeComponent["only"]()',
            errors: [ { message: expectedErrorMessage, column: 19, line: 1 } ]
        },
        {
            code: 'describeModel.only()',
            errors: [ { message: expectedErrorMessage, column: 15, line: 1 } ]
        },
        {
            code: 'describeModel["only"]()',
            errors: [ { message: expectedErrorMessage, column: 15, line: 1 } ]
        },
        {
            code: 'describeModule.only()',
            errors: [ { message: expectedErrorMessage, column: 16, line: 1 } ]
        },
        {
            code: 'describeModule["only"]()',
            errors: [ { message: expectedErrorMessage, column: 16, line: 1 } ]
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
        }
    ]

});
