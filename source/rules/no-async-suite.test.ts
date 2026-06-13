import { RuleTester } from 'eslint';
import { noAsyncSuiteRule } from './no-async-suite.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-async-suite', noAsyncSuiteRule, {
    valid: [
        'describe()',
        'describe("hello")',
        'describe(function () {})',
        'describe("hello", function () {})',
        { code: '() => { a.b }', languageOptions: { ecmaVersion: 6 } },
        { code: 'describe("hello", () => { a.b })', languageOptions: { ecmaVersion: 6 } },
        'it()',
        { code: 'it("hello", async function () {})', languageOptions: { ecmaVersion: 8 } },
        { code: 'it("hello", async () => {})', languageOptions: { ecmaVersion: 8 } }
    ],

    invalid: [
        {
            code: 'describe("hello", async function () {})',
            output: 'describe("hello", function () {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 39
            } ]
        },
        {
            code: 'foo("hello", async function () {})',
            output: 'foo("hello", function () {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in foo()',
                line: 1,
                column: 14,
                endLine: 1,
                endColumn: 34
            } ],
            name: 'invalid case 1',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe("hello", async () => {})',
            output: 'describe("hello", () => {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 33
            } ]
        },
        {
            code: 'describe("hello", async () => foo)',
            output: 'describe("hello", () => foo)',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 34
            } ]
        },
        {
            code: 'describe("hello", async () => {await foo;})',
            // Do not offer a fix for an async function that contains await
            output: null,
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 43
            } ]
        },
        {
            code: 'describe("hello", async () => {const bar = await foo;})',
            // Do not offer a fix when await appears inside a declaration
            output: null,
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 55
            } ]
        },
        {
            code: 'describe("hello", async () => {if (ready) {await foo;}})',
            // Do not offer a fix when await appears inside control flow
            output: null,
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 56
            } ]
        },
        {
            code: 'describe("hello", async () => {async function bar() {await foo;}})',
            // Do offer a fix despite a nested async function containing await
            output: 'describe("hello", () => {async function bar() {await foo;}})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19,
                endLine: 1,
                endColumn: 66
            } ]
        },
        {
            code: 'describe.foo("bar")("hello", async () => {})',
            output: 'describe.foo("bar")("hello", () => {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in describe.foo()()',
                line: 1,
                column: 30,
                endLine: 1,
                endColumn: 44
            } ],
            name: 'invalid case 2',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'describe.foo()', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'forEach([ 1, 2, 3 ]).describe.foo("hello", async () => {})',
            output: 'forEach([ 1, 2, 3 ]).describe.foo("hello", () => {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Unexpected async function in forEach().describe.foo()',
                line: 1,
                column: 44,
                endLine: 1,
                endColumn: 58
            } ],
            name: 'invalid case 3',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        }
    ]
});
