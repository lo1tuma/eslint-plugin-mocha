import { RuleTester } from 'eslint';
import { noGlobalTestsRule } from './no-global-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected global mocha test.';

ruleTester.run('no-global-tests', noGlobalTestsRule, {
    valid: [
        'describe();',
        'suite();',
        'context();',
        'describe("", function () { it(); });',
        'describe("", function () { it.only(); });',
        'describe("", function () { it.skip(); });',
        'describe("", function () { test();  });',
        'describe("", function () { test.only(); });',
        'describe("", function () { test.skip(); });',
        'describe.only("", function () { it(); });',
        'describe.skip("", function () { it(); });',
        'suite("", function () { it(); });',
        'suite("", function () { test(); });',
        'suite.only("", function () { it(); });',
        'suite.skip("", function () { it(); });',
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
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it.only();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it["only"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it.skip();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'it["skip"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test.only();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test["only"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test.skip();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'test["skip"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify.only();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify["only"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify.skip();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'specify["skip"]();',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'import foo from "bar"; it("");',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            },
            errors: [{ message: expectedErrorMessage, column: 24, line: 1 }]
        }
    ]
});
