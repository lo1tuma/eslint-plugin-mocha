'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();

ruleTester.run('no-synchronous-tests', rules['no-synchronous-tests'], {
    valid: [
        'it();',
        'it("");',
        'it("", function () { return promise(); });',
        'it("", function () { return promise(); });',
        'it("", function () { var promise = myFn(); return promise; });',
        'var someFn = function(){ }; it("", someFn);',
        'it("", function (done) { });',
        'it("", function (done) { done(); });',
        'it("", function (callback) { callback(); });',
        'it("", function (done) { if (a) { done(); } });',
        'it("", function (done) { function foo() { done(); } });',
        'it("", function (done) { setTimeout(done, 300); });',
        'it("", function (done) { done(new Error("foo")); });',
        'it("", function (done) { promise.then(done).catch(done); });',
        'it.only("", function (done) { done(); });',
        'test("", function (done) { done(); });',
        'test.only("", function (done) { done(); });',
        'before(function (done) { done(); });',
        'after(function (done) { done(); });',
        'beforeEach(function (done) { done(); });',
        'afterEach(function (done) { done(); });',
        'ignoredFunction(function () { });',
        'var foo = function () { };',
        {
            code: 'it("", (done) => { done(); });',
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: 'it("", () => { return promise(); });',
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: 'it("", () => promise() );',
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: 'it("", () => promise.then() );',
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: 'it("", async function () { });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'it("", async function () { return true; });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'it("", async function (val) { return await new Promise((resolve) => { resolve(val); }); });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'before("", async function () { });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'beforeEach("", async function () { });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'after("", async function () { });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'afterEach("", async function () { });',
            parserOptions: { ecmaVersion: 8 }
        },
        {
            code: 'it("", function (done) { done(); });',
            options: []
        },
        {
            code: 'it("", function (done) { done(); });',
            options: [ { } ]
        }
    ],

    invalid: [
        {
            code: 'it("", function () {});',
            errors: [ { message: 'Unexpected synchronous test.', column: 8, line: 1 } ]
        },
        {
            code: 'it("", function () { callback(); });',
            errors: [ { message: 'Unexpected synchronous test.', column: 8, line: 1 } ]
        },
        {
            code: 'it(function () { return; });',
            errors: [ { message: 'Unexpected synchronous test.', column: 4, line: 1 } ]
        },
        {
            code: 'it("", function () { return "a string" });',
            errors: [ { message: 'Unexpected synchronous test.', column: 8, line: 1 } ]
        },
        {
            code: 'it("", () => "not-a-promise" );',
            parserOptions: { ecmaVersion: 6 },
            errors: [ { message: 'Unexpected synchronous test.', column: 8, line: 1 } ]
        },
        {
            code: 'specify("", function () {});',
            errors: [ { message: 'Unexpected synchronous test.', column: 13, line: 1 } ]
        },
        {
            code: 'specify.only("", function () {});',
            errors: [ { message: 'Unexpected synchronous test.', column: 18, line: 1 } ]
        },
        {
            code: 'before("", function () {});',
            errors: [ { message: 'Unexpected synchronous test.', column: 12, line: 1 } ]
        },
        {
            options: [ { allowed: [ 'callback', 'async' ] } ],
            code: 'it("", function () { return promise(); });',
            errors: [ { message: 'Unexpected synchronous test.', column: 8, line: 1 } ]
        }
    ]
});
