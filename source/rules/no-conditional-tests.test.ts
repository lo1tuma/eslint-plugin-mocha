import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noConditionalTestsRule } from './no-conditional-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-conditional-tests', noConditionalTestsRule, {
    valid: [
        'describe("suite", function () { it("works", function () {}); });',
        'it("works", function () { if (condition) { doWork(); } });',
        'if (condition) { before(function () {}); }',
        'condition && beforeEach(function () {});',
        'condition ? afterEach(function () {}) : after(function () {});',
        withInterface('TDD', 'suite("suite", function () { test("works", function () {}); });'),
        {
            code: 'foo("suite", function () { bar("works", function () {}); });',
            name: 'allows custom suite and test calls without conditionals',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' },
                        { name: 'bar', type: 'testCase', interface: 'BDD' }
                    ]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'if (condition) { it("works", function () {}); }',
            errors: [ {
                message: 'Unexpected conditional Mocha suite or test declaration.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 45
            } ]
        },
        {
            code: 'condition && describe("suite", function () {});',
            errors: [ {
                message: 'Unexpected conditional Mocha suite or test declaration.',
                column: 14,
                line: 1,
                endLine: 1,
                endColumn: 47
            } ]
        },
        {
            code: 'condition ? it("left", function () {}) : it("right", function () {});',
            errors: [
                {
                    message: 'Unexpected conditional Mocha suite or test declaration.',
                    column: 13,
                    line: 1,
                    endLine: 1,
                    endColumn: 39
                },
                {
                    message: 'Unexpected conditional Mocha suite or test declaration.',
                    column: 42,
                    line: 1,
                    endLine: 1,
                    endColumn: 69
                }
            ]
        },
        withInterface('TDD', {
            code: 'condition && test("works", function () {});',
            errors: [ { message: 'Unexpected conditional Mocha suite or test declaration.', column: 14, line: 1 } ]
        }),
        {
            code: 'foo && bar("works", function () {});',
            errors: [ {
                message: 'Unexpected conditional Mocha suite or test declaration.',
                column: 8,
                line: 1,
                endLine: 1,
                endColumn: 36
            } ],
            name: 'reports a conditional custom test call',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'bar', type: 'testCase', interface: 'BDD' } ]
                }
            }
        }
    ]
});
