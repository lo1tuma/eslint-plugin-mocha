import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { noCodeAfterDoneRule } from './no-code-after-done.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not execute code after calling the Mocha callback';
const typescriptLanguageOptions = { parser: typescriptParser };

ruleTester.run('no-code-after-done', noCodeAfterDoneRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { return done(); });',
        'it("title", function(done) { const foo = done; foo(); });',
        'it("title", function(finish) { finish(); });',
        'it("title", function([finish]) { finish(); });',
        'it("title", function(done) { handler(function () { done(); return; }); });',
        'it("title", function(done) { const foo = done; setTimeout(foo, 0); });',
        'it("title", function(done) { getCallbacks().complete = done; done(); });',
        'it("title", async function() { await work(); });',
        'it("title", function() { work(); });',
        'notMocha("title", function(done) { done(); expect(true).to.be.false; });',

        {
            code: 'it("title", function(this: Mocha.Context, done) { done(); });',
            languageOptions: typescriptLanguageOptions
        }
    ],

    invalid: [
        {
            code: 'it("title", function(done) { done(); expect(true).to.be.true; });',
            errors: [ { message, line: 1, column: 38, endLine: 1, endColumn: 50 } ]
        },
        {
            code: 'it("title", function(done) { const foo = done; foo(); expect(true).to.be.true; });',
            errors: [ { message, line: 1, column: 55, endLine: 1, endColumn: 67 } ]
        },
        {
            code: 'it("title", function(done) { const foo = done; setTimeout(foo, 0); expect(true).to.be.true; });',
            errors: [ { message, line: 1, column: 68, endLine: 1, endColumn: 80 } ]
        },
        {
            code: 'it("title", function(done) { let finish; finish = done; finish(); expect(true).to.be.true; });',
            errors: [ { message, line: 1, column: 67, endLine: 1, endColumn: 79 } ]
        },
        {
            code: 'it("title", function(done) { var callbacks = {}; callbacks.complete = done; ' +
                'callbacks.complete(); expect(true).to.be.true; });',
            errors: [ { message, line: 1, column: 99, endLine: 1, endColumn: 111 } ]
        },
        {
            code: 'it("title", function(done) { handler(function () { done(); expect(true).to.be.true; }); });',
            errors: [ { message, line: 1, column: 60, endLine: 1, endColumn: 72 } ]
        },
        {
            code: 'beforeEach(function(done) { done(); setupNextStep(); });',
            errors: [ { message, line: 1, column: 37, endLine: 1, endColumn: 52 } ]
        },
        {
            code: 'it("title", function(done) { let finish = done; done(); finish++; });',
            errors: [ { message, line: 1, column: 57, endLine: 1, endColumn: 65 } ]
        },
        {
            code: 'it("title", function(done) { var callbacks = { complete: done }; done(); callbacks.complete++; });',
            errors: [ { message, line: 1, column: 74, endLine: 1, endColumn: 94 } ]
        },
        {
            code:
                'it("title", function(done) { var callbacks = { complete: done }; done(); delete callbacks.complete; });',
            errors: [ { message, line: 1, column: 74, endLine: 1, endColumn: 99 } ]
        },
        {
            code: 'it("title", function(this: Mocha.Context, done) { done(); expect(true).to.be.true; });',
            languageOptions: typescriptLanguageOptions,
            errors: [ { message, line: 1, column: 59, endLine: 1, endColumn: 71 } ]
        }
    ]
});
