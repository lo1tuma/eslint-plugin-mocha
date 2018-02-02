'use strict';

var RuleTester = require('eslint').RuleTester,
    rule = require('../../lib/rules/pure-describe'),
    ruleTester = new RuleTester();

ruleTester.run('pure-describe', rule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'describe("", function () { it(); })',
        'describe("", function () { it("", function () { b(); }); })',
        'describe("", function () { function a() { b() }; it(); })',
        { code: 'describe("", function () { var a = () => b(); it(); })', parserOptions: { ecmaVersion: 6 } },
        'describe("", function () { describe("", function () { it(); }); it(); })',
        {
            code: 'foo("", function () { it(); })',
            settings: {
                'mocha/additionalSuiteNames': [ 'foo' ]
            }
        }, {
            code: 'foo("", function () { it(); })',
            settings: {
                mocha: {
                   additionalSuiteNames: [ 'foo' ]
               }
           }
        }
    ],

    invalid: [
        {
            code: 'describe("", function () { a() });',
            errors: [ {
                message: 'Unexpected function call inside describe.',
                line: 1,
                column: 28
            } ]
        }
    ]
});
