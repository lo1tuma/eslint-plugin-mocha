'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('handle-done-callback', rules['handle-done-callback'], {
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

        {
            code: 'it("", (done) => { done(); });',
            parserOptions: { ecmaVersion: 6 }
        }
    ],

    invalid: [
        {
            code: 'it("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it("", function (done) { callback(); });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it("", function (callback) { });',
            errors: [ { message: 'Expected "callback" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it("", function (done) { asyncFunction(function (error) { expect(error).to.be.null; }); });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 23, line: 1 } ]
        },
        {
            code: 'test("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 20, line: 1 } ]
        },
        {
            code: 'test.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 25, line: 1 } ]
        },
        {
            code: 'specify("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 23, line: 1 } ]
        },
        {
            code: 'specify.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 28, line: 1 } ]
        },
        {
            code: 'before(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'after(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'beforeEach(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 22, line: 1 } ]
        },
        {
            code: 'afterEach(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 21, line: 1 } ]
        },
        {
            code: 'it("", (done) => { });',
            parserOptions: { ecmaVersion: 6 },
            errors: [ { message: 'Expected "done" callback to be handled.', column: 9, line: 1 } ]
        },
        {
            code: 'it("", function (done) { return done; });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it("", function (done) { done; });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        },
        {
            code: 'it("", function (done) { var foo = done; });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 18, line: 1 } ]
        }
    ]
});
