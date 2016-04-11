'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

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
        }

    ]
});
