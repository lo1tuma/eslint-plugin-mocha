'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    es6RuleTester = new RuleTester({
        parserOptions: { ecmaVersion: 6 }
    }),
    expectedErrorMessage = 'Do not pass arrow functions to it()',
    es2017RuleTester = new RuleTester({
        parserOptions: { ecmaVersion: 2017 }
    }),
    errors = [ { message: expectedErrorMessage, column: 1, line: 1 } ];

es6RuleTester.run('no-mocha-arrows', rules['no-mocha-arrows'], {

    valid: [
        'it()',
        'it(function() { assert(something, false); })',
        'it("should be false", function() { assert(something, false); })',
         // In this example, `it` is not a global.
        'function it () {}; it(() => { console.log("okay") })',
        'it.only()',
        'it(function(done) { assert(something, false); done(); })',
        'it(function*() { assert(something, false) })'
    ],

    invalid: [
        {
            code: 'it(() => { assert(something, false); })',
            errors: errors,
            output: 'it(function () { assert(something, false); })'
        },
        {
            code: 'it(() => { assert(something, false); })',
            globals: [ 'it' ],
            errors: errors,
            output: 'it(function () { assert(something, false); })'
        },
        {
            code: 'it(() => assert(something, false))',
            errors: errors,
            output: 'it(function () { return assert(something, false); })'
        },
        {
            code: 'it("should be false", () => { assert(something, false); })',
            errors: errors,
            output: 'it("should be false", function () { assert(something, false); })'
        },
        {
            code: 'it.only(() => { assert(something, false); })',
            errors: [ { message: 'Do not pass arrow functions to it.only()', column: 1, line: 1 } ],
            output: 'it.only(function () { assert(something, false); })'
        },
        {
            code: 'it((done) => { assert(something, false); })',
            errors: errors,
            output: 'it(function (done) { assert(something, false); })'
        },
        {
            code: 'it("should be false", () => {\n assert(something, false);\n})',
            errors: errors,
            output: 'it("should be false", function () {\n assert(something, false);\n})'
        }
    ]

});

es2017RuleTester.run('no-mocha-arrows', rules['no-mocha-arrows'], {

    valid: [
        'it(async function () { assert(something, false) })'
    ],

    invalid: [
        {
            code: 'it(async () => { assert(something, false) })',
            errors: errors,
            output: 'it(async function () { assert(something, false) })'
        },
        {
            code: 'it(async () => assert(something, false))',
            errors: errors,
            output: 'it(async function () { return assert(something, false); })'
        },
        {
            code: 'it(async() => assert(something, false))',
            errors: errors,
            output: 'it(async function() { return assert(something, false); })'
        }
    ]

});
