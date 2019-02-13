'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../lib/rules/no-async-describe');
const ruleTester = new RuleTester();

ruleTester.run('no-async-describe', rule, {
    valid: [
        'describe()',
        'describe("hello")',
        'describe(function () {})',
        'describe("hello", function () {})',
        { code: '() => { a.b }', parserOptions: { ecmaVersion: 6 } },
        { code: 'describe("hello", () => { a.b })', parserOptions: { ecmaVersion: 6 } },
        'it()',
        { code: 'it("hello", async function () {})', parserOptions: { ecmaVersion: 8 } },
        { code: 'it("hello", async () => {})', parserOptions: { ecmaVersion: 8 } }
    ],

    invalid: [
        {
            code: 'describe("hello", async function () {})',
            output: 'describe("hello", function () {})',
            parserOptions: { ecmaVersion: 8 }, errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            } ]
        },
        {
            code: 'foo("hello", async function () {})',
            output: 'foo("hello", function () {})',
            settings: {
                mocha: {
                    additionalSuiteNames: [ 'foo' ]
                }
            },
            parserOptions: { ecmaVersion: 8 }, errors: [ {
                message: 'Unexpected async function in foo()',
                line: 1,
                column: 14
            } ]
        },
        {
            code: 'describe("hello", async () => {})',
            output: 'describe("hello", () => {})',
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            } ]
        },
        {
            code: 'describe("hello", async () => {await foo;})',
            // Do not offer a fix for an async function that contains await
            output: null,
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            } ]
        },
        {
            code: 'describe("hello", async () => {async function bar() {await foo;}})',
            // Do offer a fix despite a nested async function containing await
            output: 'describe("hello", () => {async function bar() {await foo;}})',
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            } ]
        }
    ]
});
