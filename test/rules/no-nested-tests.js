'use strict';

var RuleTester = require('eslint').RuleTester,
    rule = require('../../lib/rules/no-nested-tests'),
    ruleTester = new RuleTester();

ruleTester.run('no-nested-tests', rule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'describe("", function () { it(); })',
        'describe("", function () { describe("", function () { it(); }); it(); })'
    ],

    invalid: [
        {
            code: 'it("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it.only("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            } ]
        },
        {
            code: 'it.skip("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            } ]
        },
        {
            code: 'test("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 24
            } ]
        },
        {
            code: 'specify("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            } ]
        },
        {
            code: 'it("", function () { describe() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it("", function () { context() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it("", function () { suite() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it("", function () { describe.skip() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it("", function () { describe("", function () { it(); it(); }); });',
            errors: [
                {
                    message: 'Unexpected suite nested within a test.',
                    line: 1,
                    column: 22
                },
                {
                    message: 'Unexpected test nested within another test.',
                    line: 1,
                    column: 49
                },
                {
                    message: 'Unexpected test nested within another test.',
                    line: 1,
                    column: 55
                }
            ]
        }
    ]
});
