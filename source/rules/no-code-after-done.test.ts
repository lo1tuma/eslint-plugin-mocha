import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { noCodeAfterDoneRule } from './no-code-after-done.js';

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
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { const foo = done; foo(); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { const foo = done; setTimeout(foo, 0); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { let finish; finish = done; finish(); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var callbacks = {}; callbacks.complete = done; ' +
                'callbacks.complete(); expect(true).to.be.true; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { handler(function () { done(); expect(true).to.be.true; }); });',
            errors: [{ message }]
        },
        {
            code: 'beforeEach(function(done) { done(); setupNextStep(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { let finish = done; done(); finish++; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var callbacks = { complete: done }; done(); callbacks.complete++; });',
            errors: [{ message }]
        },
        {
            code:
                'it("title", function(done) { var callbacks = { complete: done }; done(); delete callbacks.complete; });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(this: Mocha.Context, done) { done(); expect(true).to.be.true; });',
            errors: [{ message }],
            languageOptions: typescriptLanguageOptions
        }
    ]
});
