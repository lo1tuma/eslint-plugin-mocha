'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    expectedErrorMessage = 'Unexpected pending mocha test.';

ruleTester.run('no-pending-tests', rules['no-pending-tests'], {

    valid: [
        'describe("test", function() { return true; })',
        'it("should be false", function() { assert(something, false); })',
        'something.describe()',
        'something.describe("test")',
        'something.it()',
        'something.it("test")'
    ],

    invalid: [
        {
            code: 'describe("this is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'it("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'suite("this is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'test("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'context("this is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'specify("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }
    ]

});
