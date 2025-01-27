import { RuleTester } from 'eslint';
import { noReturnFromAsyncRule } from './no-return-from-async.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Unexpected use of `return` in a test with an async function';
const es6LanguageOptions = {
    sourceType: 'module',
    ecmaVersion: 8
} as const;

ruleTester.run('no-return-from-async', noReturnFromAsyncRule, {
    valid: [
        {
            code: 'it("title", function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { async function other() { return foo.then(function () {}); } });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { const bar = async () => { return foo.then(function () {}); }; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { const bar = { async a() { return foo.then(function () {}); } }; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async () => {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it.only("title", async function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'before("title", async function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'after("title", async function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'async function foo() { return foo.then(function () {}); }',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'var foo = async function() { return foo.then(function () {}); }',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'notMocha("title", async function() { return foo.then(function () {}); })',
            languageOptions: es6LanguageOptions
        },
        // Allowed return statements
        {
            code: 'it("title", async function() { return; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { return undefined; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { return null; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { return "3"; });',
            languageOptions: es6LanguageOptions
        }
    ],

    invalid: [
        {
            code: 'it("title", async function() { return foo; });',
            errors: [{ message, column: 32, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { return foo.then(function() {}).catch(function() {}); });',
            errors: [{ message, column: 32, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { var foo = bar(); return foo.then(function() {}); });',
            errors: [{ message, column: 49, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async () => { return foo.then(function() {}).catch(function() {}); });',
            errors: [{ message, column: 27, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async () => foo.then(function() {}));',
            errors: [{ message: 'Confusing implicit return in a test with an async function', column: 25, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it.only("title", async function() { return foo.then(function () {}); });',
            errors: [{ message, column: 37, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'before("title", async function() { return foo.then(function() {}); });',
            errors: [{ message, column: 36, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'beforeEach("title", async function() { return foo.then(function() {}); });',
            errors: [{ message, column: 40, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'after("title", async function() { return foo.then(function() {}); });',
            errors: [{ message, column: 35, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'afterEach("title", async function() { return foo.then(function() {}); });',
            errors: [{ message, column: 39, line: 1 }],
            languageOptions: es6LanguageOptions
        },
        {
            code: 'afterEach("title", async function() { return foo; });',
            errors: [{ message, column: 39, line: 1 }],
            languageOptions: es6LanguageOptions
        }
    ]
});
