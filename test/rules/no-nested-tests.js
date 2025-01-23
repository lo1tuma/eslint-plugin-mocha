import { RuleTester } from 'eslint';
import { noNestedTestsRule } from '../../lib/rules/no-nested-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-nested-tests', noNestedTestsRule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'describe("", function () { it(); })',
        'describe("", function () { describe("", function () { it(); }); it(); })',
        {
            code: 'foo("", function () { it(); })',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', interface: 'BDD' }]
            }
        },
        {
            code: 'foo("", function () { it(); })',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'it("", function () { it() });',
            errors: [{
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'it.only("", function () { it() });',
            errors: [{
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            }]
        },
        {
            code: 'it.skip("", function () { it() });',
            errors: [{
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            }]
        },
        {
            code: 'test("", function () { it() });',
            errors: [{
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 24
            }]
        },
        {
            code: 'specify("", function () { it() });',
            errors: [{
                message: 'Unexpected test nested within another test.',
                line: 1,
                column: 27
            }]
        },
        {
            code: 'it("", function () { describe() });',
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'it("", function () { context() });',
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'it("", function () { suite() });',
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'it("", function () { describe.skip() });',
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
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
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'it("", function () { foo() });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{
                message: 'Unexpected suite nested within a test.',
                line: 1,
                column: 22
            }]
        },
        {
            code: 'beforeEach(function () { it("foo", function () {}); });',
            errors: [{
                message: 'Unexpected test nested within a test hook.',
                line: 1,
                column: 26
            }]
        },
        {
            code: 'beforeEach(function () { describe("foo", function () {}); });',
            errors: [{
                message: 'Unexpected suite nested within a test hook.',
                line: 1,
                column: 26
            }]
        },
        {
            code: 'beforeEach(function () { beforeEach(function () {}); });',
            errors: [{
                message: 'Unexpected test hook nested within a test hook.',
                line: 1,
                column: 26
            }]
        }
    ]
});
