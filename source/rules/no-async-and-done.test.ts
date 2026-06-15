import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { noAsyncAndDoneRule } from './no-async-and-done.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not use an async function together with a Mocha callback parameter';
const es6LanguageOptions = {
    sourceType: 'module',
    ecmaVersion: 8
} as const;
const typescriptLanguageOptions = { parser: typescriptParser };

ruleTester.run('no-async-and-done', noAsyncAndDoneRule, {
    valid: [
        'it("title", function(done) {});',
        {
            code: 'it("title", async function() {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function() { async function other(done) {} });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", function() { const other = async function(done) {}; });',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'notMocha("title", async function(done) {});',
            languageOptions: es6LanguageOptions
        },
        {
            code: 'it("title", async function(this: Context) {});',
            languageOptions: typescriptLanguageOptions
        }
    ],

    invalid: [
        {
            code: 'it("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 13, line: 1, endLine: 1, endColumn: 36 } ]
        },
        {
            code: 'it("title", async (done) => {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 13, line: 1, endLine: 1, endColumn: 31 } ]
        },
        {
            code: 'it.only("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 18, line: 1, endLine: 1, endColumn: 41 } ]
        },
        {
            code: 'before("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 17, line: 1, endLine: 1, endColumn: 40 } ]
        },
        {
            code: 'beforeEach("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 21, line: 1, endLine: 1, endColumn: 44 } ]
        },
        {
            code: 'after("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 16, line: 1, endLine: 1, endColumn: 39 } ]
        },
        {
            code: 'afterEach("title", async function(done) {});',
            languageOptions: es6LanguageOptions,
            errors: [ { message, column: 20, line: 1, endLine: 1, endColumn: 43 } ]
        }
    ]
});
