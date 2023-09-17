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
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interfaces: [ 'BDD' ] } ]
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
        },
        {
            code: 'describe.foo("bar")("hello", async () => {})',
            output: 'describe.foo("bar")("hello", () => {})',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'describe.foo()', type: 'suite', interfaces: [ 'BDD' ] }
                    ]
                }
            },
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe.foo()()',
                line: 1,
                column: 30
            } ]
        },
        {
            code: 'forEach([ 1, 2, 3 ]).describe.foo("hello", async () => {})',
            output: 'forEach([ 1, 2, 3 ]).describe.foo("hello", () => {})',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe.foo', type: 'suite', interfaces: [ 'BDD' ] }
                    ]
                }
            },
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in forEach().describe.foo()',
                line: 1,
                column: 44
            } ]
        }
    ]
});
