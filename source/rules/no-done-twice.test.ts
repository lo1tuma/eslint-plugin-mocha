import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { noDoneTwiceRule } from './no-done-twice.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const message = 'Do not call the Mocha callback more than once';
const typescriptLanguageOptions = { parser: typescriptParser };

ruleTester.run('no-done-twice', noDoneTwiceRule, {
    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { const foo = done; foo(); });',
        'it("title", function(finish) { finish(); });',
        'it("title", function() { work(); });',
        'it("title", function([finish]) { finish(); });',
        'it("title", function(done) { return done(); done(); });',
        'it("title", function(done) { if (failed) { done(error); } else { done(); } });',
        'it("title", function(done) { var finish = done; if (failed) { finish(error); } else { done(); } });',
        'it("title", function(done) { if (failed) { setTimeout(done, 0); } else { done(); } });',
        'it("title", function(done) { var finish = done; if (failed) { setTimeout(finish, 0); } else { done(); } });',
        'it("title", function(done) { var callbacks = { complete: done }; if (failed) { setTimeout(callbacks.complete, 0); } else { callbacks.complete(); } });',
        'it("title", function(done) { let finish = done; finish++; done(); });',
        'it("title", function(done) { var callbacks = { complete: done }; callbacks.complete++; done(); });',
        'it("title", function(done) { var callbacks = { complete: done }; delete callbacks.complete; done(); });',
        'it("title", function(done) { getCallbacks().complete = done; done(); });',
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
            errors: [ { message, line: 1, column: 38, endLine: 1, endColumn: 44 } ]
        },
        {
            code: 'it("title", function(done) { const foo = done; foo(); foo(); });',
            errors: [ { message, line: 1, column: 55, endLine: 1, endColumn: 60 } ]
        },
        {
            code: 'it("title", function(finish) { finish(); finish(); });',
            errors: [ { message, line: 1, column: 42, endLine: 1, endColumn: 50 } ]
        },
        {
            code: 'it("title", function(done) { if (failed) { done(error); } done(); });',
            errors: [ { message, line: 1, column: 59, endLine: 1, endColumn: 65 } ]
        },
        {
            code: 'it("title", function(done) { var finish = done; finish(); finish(); });',
            errors: [ { message, line: 1, column: 59, endLine: 1, endColumn: 67 } ]
        },
        {
            code: 'it("title", function(done) { var finish = done; if (failed) { finish(error); } else { done(); } ' +
                'finish(); });',
            errors: [ { message, line: 1, column: 97, endLine: 1, endColumn: 105 } ]
        },
        {
            code: 'it("title", function(done) { setTimeout(done, 0); done(); });',
            errors: [ { message, line: 1, column: 51, endLine: 1, endColumn: 57 } ]
        },
        {
            code: 'it("title", function(done) { done(); setTimeout(done, 0); });',
            errors: [ { message, line: 1, column: 38, endLine: 1, endColumn: 57 } ]
        },
        {
            code: 'it("title", function(done) { var finish = done; setTimeout(finish, 0); finish(); });',
            errors: [ { message, line: 1, column: 72, endLine: 1, endColumn: 80 } ]
        },
        {
            code: 'it("title", function(done) { var callbacks = { complete: done }; ' +
                'setTimeout(callbacks.complete, 0); callbacks.complete(); });',
            errors: [ { message, line: 1, column: 101, endLine: 1, endColumn: 121 } ]
        },
        {
            code: 'it("title", function(done) { let finish; finish = done; finish(); finish(); });',
            errors: [ { message, line: 1, column: 67, endLine: 1, endColumn: 75 } ]
        },
        {
            code: 'it("title", function(done) { var callbacks = {}; callbacks.complete = done; ' +
                'callbacks.complete(); callbacks.complete(); });',
            errors: [ { message, line: 1, column: 99, endLine: 1, endColumn: 119 } ]
        },
        {
            code: 'it("title", function(done) { var callbacks = {}; callbacks["complete"] = done; ' +
                'callbacks.complete(); callbacks.complete(); });',
            errors: [ { message, line: 1, column: 102, endLine: 1, endColumn: 122 } ]
        },
        {
            code: 'beforeEach(function(done) { done(); done(); });',
            errors: [ { message, line: 1, column: 37, endLine: 1, endColumn: 43 } ]
        },
        {
            code: 'it("title", function(this: Mocha.Context, finish) { finish(); finish(); });',
            languageOptions: typescriptLanguageOptions,
            errors: [ { message, line: 1, column: 63, endLine: 1, endColumn: 71 } ]
        }
    ]
});
