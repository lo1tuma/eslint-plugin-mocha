'use strict';

var RuleTester = require('eslint').RuleTester;
var rule = require('../../lib/rules/no-synchronous-tests');

var ruleTester = new RuleTester();

ruleTester.run('no-synchronous-tests', rule, {
    valid: [
        'it();',
        'it("");',
        'it("", function () { return promise(); });',
        'it("", function () { return promise(); });',
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
            ecmaFeatures: { arrowFunctions: true }
        },
        {
            code: 'it("", () => { return promise(); });',
            ecmaFeatures: { arrowFunctions: true }
        },
        {
            code: 'it("", () => promise() );',
            ecmaFeatures: { arrowFunctions: true }
        }
    ],

    invalid: [
        {
            code: 'it("", function () {});',
            errors: [ { message: 'Expected test to handle a callback or return a promise.', column: 8, line: 1 } ]
        },
        {
            code: 'it("", function () { callback(); });',
            errors: [ { message: 'Expected test to handle a callback or return a promise.', column: 8, line: 1 } ]
        },
        {
            code: 'it(function () { return; });',
            errors: [ { message: 'Expected test to handle a callback or return a promise.', column: 4, line: 1 } ]
        },
        {
            code: 'it("", function () { return "a string" });',
            errors: [ { message: 'Expected test to handle a callback or return a promise.', column: 8, line: 1 } ]
        },
        {
            code: 'it("", () => "not-a-promise" );',
            ecmaFeatures: { arrowFunctions: true },
            errors: [ { message: 'Expected test to handle a callback or return a promise.', column: 8, line: 1 } ]
        }
    ]
});
