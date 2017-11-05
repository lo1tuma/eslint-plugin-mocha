
'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    ALWAYS_MESSAGE = 'Test functions must be padded by blank lines.',
    NEVER_MESSAGE = 'Test functions must not be padded by blank lines.';

ruleTester.run('padding-between-tests', rules['padding-between-test-functions'], {

    valid: [
        {
            code: 'describe(function(){\n\nit("", function () {})\n\n})'
        },
        {
            code: 'describe(function(){\n\nit("", function () {})\n\n})',
            options: [ 'always' ]
        },
        {
            code: 'describe(function(){\n\nit.only("", function () {})\n\n})',
            options: [ 'always' ]
        },
        {
            code: 'describe(function(){\nit("", function () {})\n})',
            options: [ 'never' ]
        },
        {
            code: 'describe(function(){\nit.only("", function () {})\n})',
            options: [ 'never' ]
        }
    ],

    invalid: [
        {
            code: 'describe(function(){\n\nit("", function () {})\n\n})',
            options: [ 'never' ],
            errors: [ { message: NEVER_MESSAGE }, { message: NEVER_MESSAGE } ],
            output: 'describe(function(){\nit("", function () {})\n})'
        },
        {
            code: 'describe(function(){\nit("", function () {})\n})',
            options: [ 'always' ],
            errors: [ { message: ALWAYS_MESSAGE }, { message: ALWAYS_MESSAGE } ],
            output: 'describe(function(){\n\nit("", function () {})\n\n})'
        }
    ]

});
