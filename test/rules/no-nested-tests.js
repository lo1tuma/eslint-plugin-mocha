'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../lib/rules/no-nested-tests');
const ruleTester = new RuleTester();

ruleTester.run('no-nested-tests', rule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'describe("", function () { it(); })',
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
        },
        {
            code: 'it("", function () { foo() });',
            settings: {
                'mocha/additionalSuiteNames': [ 'foo' ]
            },
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'it("", function () { foo() });',
            settings: {
                mocha: {
                    additionalSuiteNames: [ 'foo' ]
                }
            },
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            } ]
        },
        {
            code: 'beforeEach(function () { it("foo", function () {}); });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 26
            } ]
        },
        {
            code: 'beforeEach(function () { beforeEach("foo", function () {}); });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 26
            } ]
        }
    ]
});
