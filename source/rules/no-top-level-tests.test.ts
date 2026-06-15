import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.ts';
import { noTopLevelTestsRule } from './no-top-level-tests.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected top-level mocha test.';

ruleTester.run('no-top-level-tests', noTopLevelTestsRule, {
    valid: [
        'describe();',
        withInterface('TDD', 'suite();'),
        'context();',
        'describe("", function () { it(); });',
        'describe("", function () { it.only(); });',
        'describe("", function () { it.skip(); });',
        'describe("", function () { test();  });',
        'describe("", function () { test.only(); });',
        'describe("", function () { test.skip(); });',
        'describe.only("", function () { it(); });',
        'describe.skip("", function () { it(); });',
        withInterface('TDD', 'suite("", function () { it(); });'),
        withInterface('TDD', 'suite("", function () { test(); });'),
        withInterface('TDD', 'suite.only("", function () { it(); });'),
        withInterface('TDD', 'suite.skip("", function () { it(); });'),
        'context("", function () { it(); });',
        'context("", function () { test(); });',
        'context.only("", function () { it(); });',
        'context.skip("", function () { it(); });',
        'something("", function () { describe("", function () { it(); }); });',
        'something("", function () { it(); });',
        'something("", function () { test(); } );',
        '[1,2,3].forEach(function () { it(); });',
        {
            code: 'import foo from "bar"; describe("", () => it());',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 6
            }
        }
    ],

    invalid: [
        {
            code: 'it();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 5 } ]
        },
        {
            code: 'it.only();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 10 } ]
        },
        {
            code: 'it["only"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 13 } ]
        },
        {
            code: 'it.skip();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 10 } ]
        },
        {
            code: 'it["skip"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 13 } ]
        },
        withInterface('TDD', {
            code: 'test();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        withInterface('TDD', {
            code: 'test.only();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        withInterface('TDD', {
            code: 'test["only"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        withInterface('TDD', {
            code: 'test.skip();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        withInterface('TDD', {
            code: 'test["skip"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        {
            code: 'specify();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 10 } ]
        },
        {
            code: 'specify.only();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 15 } ]
        },
        {
            code: 'specify["only"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 18 } ]
        },
        {
            code: 'specify.skip();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 15 } ]
        },
        {
            code: 'specify["skip"]();',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 18 } ]
        },
        {
            code: 'import foo from "bar"; it("");',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            },
            errors: [ { message: expectedErrorMessage, column: 24, line: 1, endLine: 1, endColumn: 30 } ]
        }
    ]
});
