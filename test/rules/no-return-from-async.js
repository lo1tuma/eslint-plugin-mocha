'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();
const message = 'Unexpected use of `return` in a test with an async function';
const es6parserOptions = {
    sourceType: 'module',
    ecmaVersion: 8
};

ruleTester.run('no-return-from-async', rules['no-return-from-async'], {

    valid: [
        {
            code: 'it("title", async function() {});',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { async function other() { return foo.then(function () {}); } });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { const bar = async () => { return foo.then(function () {}); }; });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { const bar = { async a() { return foo.then(function () {}); } }; });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async () => {});',
            parserOptions: es6parserOptions
        },
        {
            code: 'it.only("title", async function() {});',
            parserOptions: es6parserOptions
        },
        {
            code: 'before("title", async function() {});',
            parserOptions: es6parserOptions
        },
        {
            code: 'after("title", async function() {});',
            parserOptions: es6parserOptions
        },
        {
            code: 'async function foo() { return foo.then(function () {}); }',
            parserOptions: es6parserOptions
        },
        {
            code: 'var foo = async function() { return foo.then(function () {}); }',
            parserOptions: es6parserOptions
        },
        {
            code: 'notMocha("title", async function() { return foo.then(function () {}); })',
            parserOptions: es6parserOptions
        },
        // Allowed return statements
        {
            code: 'it("title", async function() { return; });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { return undefined; });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { return null; });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { return "3"; });',
            parserOptions: es6parserOptions
        }
    ],

    invalid: [
        {
            code: 'it("title", async function() { return foo; });',
            errors: [ { message, column: 32, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { return foo.then(function() {}).catch(function() {}); });',
            errors: [ { message, column: 32, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async function() { var foo = bar(); return foo.then(function() {}); });',
            errors: [ { message, column: 49, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async () => { return foo.then(function() {}).catch(function() {}); });',
            errors: [ { message, column: 27, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", async () => foo.then(function() {}));',
            errors: [ { message: 'Confusing implicit return in a test with an async function', column: 25, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it.only("title", async function() { return foo.then(function () {}); });',
            errors: [ { message, column: 37, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'before("title", async function() { return foo.then(function() {}); });',
            errors: [ { message, column: 36, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'beforeEach("title", async function() { return foo.then(function() {}); });',
            errors: [ { message, column: 40, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'after("title", async function() { return foo.then(function() {}); });',
            errors: [ { message, column: 35, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'afterEach("title", async function() { return foo.then(function() {}); });',
            errors: [ { message, column: 39, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'afterEach("title", async function() { return foo; });',
            errors: [ { message, column: 39, line: 1 } ],
            parserOptions: es6parserOptions
        }
    ]
});
