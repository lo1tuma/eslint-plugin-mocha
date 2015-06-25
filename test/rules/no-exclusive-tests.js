'use strict';

var linter = require('eslint').linter,
    ESLintTester = require('eslint-tester'),
    eslintTester = new ESLintTester(linter),
    expectedErrorMessage = 'Unexpected exclusive mocha test.';

eslintTester.addRuleTest('lib/rules/no-exclusive-tests', {

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
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'describe["only"]()',
            errors: [ { message: expectedErrorMessage, column: 9, line: 1 } ]
        },
        {
            code: 'it.only()',
            errors: [ { message: expectedErrorMessage, column: 3, line: 1 } ]
        },
        {
            code: 'it["only"]()',
            errors: [ { message: expectedErrorMessage, column: 3, line: 1 } ]
        },
        {
            code: 'suite.only()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ]
        },
        {
            code: 'suite["only"]()',
            errors: [ { message: expectedErrorMessage, column: 6, line: 1 } ]
        },
        {
            code: 'test.only()',
            errors: [ { message: expectedErrorMessage, column: 5, line: 1 } ]
        },
        {
            code: 'test["only"]()',
            errors: [ { message: expectedErrorMessage, column: 5, line: 1 } ]
        },
        {
            code: 'context.only()',
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        },
        {
            code: 'context["only"]()',
            errors: [ { message: expectedErrorMessage, column: 8, line: 1 } ]
        }
    ]

});
