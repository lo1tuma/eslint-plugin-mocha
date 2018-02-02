'use strict';

var RuleTester = require('eslint').RuleTester,
    rule = require('../../lib/rules/pure-describe'),
    ruleTester = new RuleTester();

ruleTester.run('pure-describe', rule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'a.b',
        'b()',
        'function g() { a() }',
        { code: '() => { a.b }', parserOptions: { ecmaVersion: 6 } },
        'it("", function () { b(); })',
        'it("", function () { a.b; })',
        'describe("", function () { it(); })',
        'describe("", function () { it("", function () { b(); }); })',
        'describe("", function () { it("", function () { a.b; }); })',
        'describe("", function () { function a() { b(); }; it(); })',
        'describe("", function () { function a() { b.c; }; it(); })',
        { code: 'describe("", function () { var a = () => b(); it(); })', parserOptions: { ecmaVersion: 6 } },
        { code: 'describe("", function () { var a = () => b.c; it(); })', parserOptions: { ecmaVersion: 6 } },
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
        }, {
            code: 'foo("", function () { it("", function () { b(); }); })',
            settings: {
                mocha: {
                   additionalSuiteNames: [ 'foo' ]
               }
           }
        }
    ],

    invalid: [
        {
            code: 'describe("", function () { a(); });',
            errors: [ {
                message: 'Unexpected function call in describe block.',
                line: 1,
                column: 28
            } ]
        }, {
            code: 'foo("", function () { a(); });',
            settings: {
                mocha: {
                   additionalSuiteNames: [ 'foo' ]
               }
            },
            errors: [ {
                message: 'Unexpected function call in describe block.',
                line: 1,
                column: 23
            } ]
        },
        {
            code: 'describe("", function () { a.b; });',
            errors: [ {
                message: 'Unexpected dot operator in describe block.',
                line: 1,
                column: 28
            } ]
        }, {
            code: 'foo("", function () { a.b; });',
            settings: {
                mocha: {
                   additionalSuiteNames: [ 'foo' ]
               }
            },
            errors: [ {
                message: 'Unexpected dot operator in describe block.',
                line: 1,
                column: 23
            } ]
        }
    ]
});
