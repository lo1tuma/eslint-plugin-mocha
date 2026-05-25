import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { noDoneTwiceRule } from './no-done-twice.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not call the Mocha callback more than once';
const typescriptLanguageOptions = { parser: typescriptParser };

ruleTester.run('no-done-twice', noDoneTwiceRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { const foo = done; foo(); });',
        'it("title", function(finish) { finish(); });',
        'it("title", function(done) { return done(); done(); });',
        'it("title", function(done) { if (failed) { done(error); } else { done(); } });',
        'it("title", function(done) { var finish = done; if (failed) { finish(error); } else { done(); } });',
        'it("title", function(done) { if (failed) { setTimeout(done, 0); } else { done(); } });',
        'it("title", function(done) { var finish = done; if (failed) { setTimeout(finish, 0); } else { done(); } });',
        'it("title", function(done) { var callbacks = { complete: done }; if (failed) { setTimeout(callbacks.complete, 0); } else { callbacks.complete(); } });',
        'it("title", function(done) { handler(function () { done(); done(); }); });',
        'beforeEach(function(done) { done(); });',
        'notMocha("title", function(done) { done(); done(); });',

        {
            code: 'it("title", function(this: Mocha.Context, finish) { finish(); });',
            languageOptions: typescriptLanguageOptions
        }
    ],

    invalid: [
        {
            code: 'it("title", function(done) { done(); done(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { const foo = done; foo(); foo(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(finish) { finish(); finish(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { if (failed) { done(error); } done(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var finish = done; finish(); finish(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var finish = done; if (failed) { finish(error); } else { done(); } ' +
                'finish(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { setTimeout(done, 0); done(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { done(); setTimeout(done, 0); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var finish = done; setTimeout(finish, 0); finish(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(done) { var callbacks = { complete: done }; ' +
                'setTimeout(callbacks.complete, 0); callbacks.complete(); });',
            errors: [{ message }]
        },
        {
            code: 'beforeEach(function(done) { done(); done(); });',
            errors: [{ message }]
        },
        {
            code: 'it("title", function(this: Mocha.Context, finish) { finish(); finish(); });',
            languageOptions: typescriptLanguageOptions,
            errors: [{ message }]
        }
    ]
});
