'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();
const expectedErrorMessage = 'Unexpected pending mocha test.';

ruleTester.run('no-pending-tests', rules['no-pending-tests'], {

    valid: [
        'it()',
        'it("should be false", function() { assert(something, false); })',
        'specify()',
        'specify("should be false", function() { assert(something, false); })',
        'something.it()',
        'something.it("test")'
    ],

    invalid: [
        {
            code: 'it("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        },
        {
            code: 'specify("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }
    ]

});
