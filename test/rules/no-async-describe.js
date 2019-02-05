'use strict';

const RuleTester = require('eslint').RuleTester;
const rule = require('../../lib/rules/no-async-describe');
const ruleTester = new RuleTester();

ruleTester.run('no-async-describe', rule, {
    valid: [
        'describe()',
        'describe(function () {})',
        { code: '() => { a.b }', parserOptions: { ecmaVersion: 6 } },
        'it()',
        { code: 'it(async function () {})', parserOptions: { ecmaVersion: 8 } },
        { code: 'it(async () => {})', parserOptions: { ecmaVersion: 8 } }
    ],

    invalid: [
        {
            code: 'describe(async function () {})',
            output: 'describe(function () {})',
            parserOptions: { ecmaVersion: 8 }, errors: [ {
                message: 'Do not pass an async function to describe()',
                line: 1,
                column: 10
            } ]
        },
        {
            code: 'foo(async function () {})',
            output: 'foo(function () {})',
            settings: {
                mocha: {
                    additionalSuiteNames: [ 'foo' ]
                }
            },
            parserOptions: { ecmaVersion: 8 }, errors: [ {
                message: 'Do not pass an async function to foo()',
                line: 1,
                column: 5
            } ]
        },
        {
            code: 'describe(async () => {})',
            output: 'describe(() => {})',
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Do not pass an async function to describe()',
                line: 1,
                column: 10
            } ]
        },
        {
            code: 'describe(async () => {await foo;})',
            // Do not offer a fix for an async function that contains await
            output: null,
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Do not pass an async function to describe()',
                line: 1,
                column: 10
            } ]
        },
        {
            code: 'describe(async () => {async function bar() {await foo;}})',
            // Do offer a fix despite a nested async function containing await
            output: 'describe(() => {async function bar() {await foo;}})',
            parserOptions: { ecmaVersion: 8 },
            errors: [ {
                message: 'Do not pass an async function to describe()',
                line: 1,
                column: 10
            } ]
        }
    ]
});
