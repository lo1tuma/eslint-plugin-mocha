'use strict';

var linter = require('eslint').linter,
    ESLintTester = require('eslint-tester'),
    eslintTester = new ESLintTester(linter);

eslintTester.addRuleTest('lib/rules/handle-done-callback', {
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
            ecmaFeatures: { arrowFunctions: true }
        }
    ],

    invalid: [
        {
            code: 'it("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'it("", function (done) { callback(); });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'it("", function (callback) { });',
            errors: [ { message: 'Expected "callback" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'it("", function (done) { asyncFunction(function (error) { expect(error).to.be.null; }); });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'it.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 22, line: 1 } ]
        },
        {
            code: 'test("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 19, line: 1 } ]
        },
        {
            code: 'test.only("", function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 24, line: 1 } ]
        },
        {
            code: 'before(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 17, line: 1 } ]
        },
        {
            code: 'after(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 16, line: 1 } ]
        },
        {
            code: 'beforeEach(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 21, line: 1 } ]
        },
        {
            code: 'afterEach(function (done) { });',
            errors: [ { message: 'Expected "done" callback to be handled.', column: 20, line: 1 } ]
        },
        {
            code: 'it("", (done) => { });',
            ecmaFeatures: { arrowFunctions: true },
            errors: [ { message: 'Expected "done" callback to be handled.', column: 8, line: 1 } ]
        }
    ]
});
