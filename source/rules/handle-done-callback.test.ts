import assert from 'node:assert';
import * as typescriptParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.ts';
import { handleDoneCallbackRule } from './handle-done-callback.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const typescriptLanguageOptions = { parser: typescriptParser };

ruleTester.run('handle-done-callback', handleDoneCallbackRule, {
    valid: [
        'foo(function (done) { });',
        'var foo = function (done) { };',
        'it();',
        'it("");',
        'it("", function () {});',
        'it("", function () { done(); });',
        'it("", function (done) { done(); });',
        'it("", function () { callback(); });',
        'it("", function (callback) { callback(); });',
        'it("", function (done) { if (a) { done(); } else { done(); } });',
        'it("", function (done) { if (a) { setTimeout(done, 300); } else { done(); } });',
        'it("", function (done) { if (a) { var next = done; next(); } else { done(); } });',
        'it("", function (done) { var next; if (a) { next = done; } else { next = done; } next(); });',
        'it("", function (done) { setTimeout(done, 300); });',
        'it("", function (done) { var obj = { someFunc: done }; somethingThatCallsSomeFuncOnObj(obj); });',
        'it("", function (done) { var obj = {}; if (a) { obj.someFunc = done; } else { obj.someFunc = done; } somethingThatCallsSomeFuncOnObj(obj); });',
        'it("", function (done) { somethingThatCallsSomeFuncOnObj({ someFunc: done }); });',
        'it("", function (done) { somethingThatCallsSomeFuncOnObj({ "someFunc": done }); });',
        'it("", function (done) { obj.someFunc = done; somethingThatCallsSomeFuncOnObj(obj); });',
        'it("", function (done) { var key = "someFunc"; var obj = {}; obj[key] = done; somethingThatCallsSomeFuncOnObj(obj[key]); });',
        'it("", function (done) { var obj = {}; obj["someFunc"] = done; somethingThatCallsSomeFuncOnObj(obj); });',
        'it("", function (done) { done(new Error("foo")); });',
        'it("", function (done) { promise.then(done).catch(done); });',
        'it("", function (done) { var [next] = [done]; done(); });',
        'it("", function (done) { ({ current: next } = source); done(); });',
        'it("", function (done) { factory().someFunc = done; done(); });',
        'it("", function (done) { var count = 0; count++; done(); });',
        'it("", function (done) { var obj = { someFunc: done }; obj.someFunc++; done(); });',
        'it("", function (done) { factory().someFunc++; done(); });',
        'it("", function (done) { typeof done; done(); });',
        'it("", function (done) { delete factory().someFunc; done(); });',
        'it("", function (done) { var obj = { someFunc: done }; delete obj.someFunc; done(); });',
        'it.only("", function (done) { done(); });',
        withInterface('TDD', 'test("", function (done) { done(); });'),
        withInterface('TDD', 'test.only("", function (done) { done(); });'),
        'before(function (done) { done(); });',
        'after(function (done) { done(); });',
        'beforeEach(function (done) { done(); });',
        'afterEach(function (done) { done(); });',

        {
            code: 'it("", (done) => { done(); });',
            languageOptions: { ecmaVersion: 6 }
        },
        {
            code: 'it.skip("", function (done) { });',
            options: [ { ignorePending: true } ],
            name: 'ignores pending tests when configured'
        },
        {
            code: 'it("", function (done) { (done as number)++; done(); });',
            languageOptions: typescriptLanguageOptions
        },
        {
            code: 'before(async function setupApplication(this: Mocha.Context) { this.timeout(6000); });',
            languageOptions: typescriptLanguageOptions
        }
    ],

    invalid: [
        {
            code: 'it("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it.skip("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 27
            } ]
        },
        {
            code: 'xit("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 19,
                line: 1,
                endLine: 1,
                endColumn: 23
            } ]
        },
        {
            code: 'it("", function (done) { callback(); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (callback) { });',
            errors: [ {
                message: 'Expected "callback" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 26
            } ]
        },
        {
            code: 'it("", function (done) { asyncFunction(function (error) { expect(error).to.be.null; }); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { if (a) { done(); } });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { function foo() { done(); } });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { if (a) { setTimeout(done, 300); } });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { var next; if (a) { next = done; } next(); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { done = other; done(); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { var obj = {}; if (a) { obj.someFunc = done; } ' +
                'somethingThatCallsSomeFuncOnObj(obj); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { somethingThatCallsSomeFuncOnObj({ [someFunc]: done }); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { var key = "someFunc"; var obj = {}; obj[key] = done; ' +
                'delete obj[key]; somethingThatCallsSomeFuncOnObj(obj[key]); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { somethingThatCallsSomeFuncOnObj(obj.someFunc); });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it.only("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 27
            } ]
        },
        withInterface('TDD', {
            code: 'test("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 20, line: 1 } ]
        }),
        withInterface('TDD', {
            code: 'test.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 25, line: 1 } ]
        }),
        {
            code: 'specify("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 27
            } ]
        },
        {
            code: 'specify.only("", function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 28,
                line: 1,
                endLine: 1,
                endColumn: 32
            } ]
        },
        {
            code: 'before(function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'after(function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 17,
                line: 1,
                endLine: 1,
                endColumn: 21
            } ]
        },
        {
            code: 'beforeEach(function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 22,
                line: 1,
                endLine: 1,
                endColumn: 26
            } ]
        },
        {
            code: 'afterEach(function (done) { });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 21,
                line: 1,
                endLine: 1,
                endColumn: 25
            } ]
        },
        {
            code: 'it("", (done) => { });',
            languageOptions: { ecmaVersion: 6 },
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 9,
                line: 1,
                endLine: 1,
                endColumn: 13
            } ]
        },
        {
            code: 'it("", function (done) { return done; });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { done; });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (done) { var foo = done; });',
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 18,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'it("", function (this: Mocha.Context, done) { });',
            languageOptions: typescriptLanguageOptions,
            errors: [ {
                message: 'Expected "done" callback to be handled.',
                column: 39,
                line: 1,
                endLine: 1,
                endColumn: 43
            } ]
        }
    ]
});

suite('handle-done-callback helpers', function () {
    test('exposes the expected default options', function () {
        assert.deepStrictEqual(handleDoneCallbackRule.meta?.defaultOptions, [ { ignorePending: false } ]);
    });
});
