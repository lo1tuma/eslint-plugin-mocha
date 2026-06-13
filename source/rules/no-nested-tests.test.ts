import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noNestedTestsRule } from './no-nested-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-nested-tests', noNestedTestsRule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'describe("", function () { it(); })',
        'describe("", function () { describe("", function () { it(); }); it(); })',
        {
            code: 'foo("", function () { it(); })',
            name: 'valid case 1',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
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
                column: 22,
                endLine: 1,
                endColumn: 26
            } ]
        },
        {
            code: 'it.only("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27,
                endLine: 1,
                endColumn: 31
            } ]
        },
        {
            code: 'it.skip("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27,
                endLine: 1,
                endColumn: 31
            } ]
        },
        withInterface('TDD', {
            code: 'test("", function () { test() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 24
            } ]
        }),
        {
            code: 'specify("", function () { it() });',
            errors: [ {
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27,
                endLine: 1,
                endColumn: 31
            } ]
        },
        {
            code: 'it("", function () { describe() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22,
                endLine: 1,
                endColumn: 32
            } ]
        },
        {
            code: 'it("", function () { context() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22,
                endLine: 1,
                endColumn: 31
            } ]
        },
        withInterface('TDD', {
            code: 'test("", function () { suite() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 24
            } ]
        }),
        {
            code: 'it("", function () { describe.skip() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22,
                endLine: 1,
                endColumn: 37
            } ]
        },
        {
            code: 'it("", function () { describe("", function () { it(); it(); }); });',
            errors: [
                {
                    message: 'Unexpected suite nested within a test.',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 63
                },
                {
                    message: 'Unexpected test nested within another test.',
                    line: 1,
                    column: 49,
                    endLine: 1,
                    endColumn: 53
                },
                {
                    message: 'Unexpected test nested within another test.',
                    line: 1,
                    column: 55,
                    endLine: 1,
                    endColumn: 59
                }
            ]
        },
        {
            code: 'it("", function () { foo() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22,
                endLine: 1,
                endColumn: 27
            } ],
            name: 'invalid case 1',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: 'it("", function () { foo() });',
            errors: [ {
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22,
                endLine: 1,
                endColumn: 27
            } ],
            name: 'invalid case 2',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'beforeEach(function () { it("foo", function () {}); });',
            errors: [ {
                message: 'Unexpected test nested within a test hook.',
                line: 1,
                column: 26,
                endLine: 1,
                endColumn: 51
            } ]
        },
        {
            code: 'beforeEach(function () { describe("foo", function () {}); });',
            errors: [ {
                message: 'Unexpected suite nested within a test hook.',
                line: 1,
                column: 26,
                endLine: 1,
                endColumn: 57
            } ]
        },
        {
            code: 'beforeEach(function () { beforeEach(function () {}); });',
            errors: [ {
                message: 'Unexpected test hook nested within a test hook.',
                line: 1,
                column: 26,
                endLine: 1,
                endColumn: 52
            } ]
        }
    ]
});
