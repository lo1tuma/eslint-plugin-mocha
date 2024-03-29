'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../..').rules;
const ruleTester = new RuleTester();
const defaultErrorMessage = 'Unexpected empty test description.';
const firstLine = { column: 1, line: 1 };

ruleTester.run('no-empty-description', rules['no-empty-description'], {

    valid: [
        'describe("some text")',
        'describe.only("some text")',
        'describe("some text", function() { })',

        'context("some text")',
        'context.only("some text")',
        'context("some text", function() { })',

        'it("some text")',
        'it.only("some text")',
        'it("some text", function() { })',

        'suite("some text")',
        'suite.only("some text")',
        'suite("some text", function() { })',

        'test("some text")',
        'test.only("some text")',
        'test("some text", function() { })',

        'var dynamicTitle = "foo"; it(dynamicTitle, function() {});',
        'it(dynamicTitle, function() {});',
        'var dynamicTitle = "foo"; it(dynamicTitle.replace("foo", ""), function() {});',
        'it(dynamicTitle.replace("foo", ""), function() {});',
        'it(42, function() { })',
        'it(true, function() { })',
        'it(null, function() { })',
        'it(new Foo(), function() { })',
        'it(foo.bar, function() { })',
        'it("foo".toUpperCase(), function() { })',
        {
            parserOptions: { ecmaVersion: 2020 },
            code: 'it(foo ?? "bar", function() { })'
        },
        'it(foo || "bar", function() { })',
        'it(foo ? "bar" : "baz", function() { })',
        'it(foo ? bar : baz, function() { })',
        'it(typeof foo, function() { })',
        'it(foo + bar, function() { })',
        'it("foo" + "bar", function() { })',
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(...args)'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'async function a() { it(await foo, function () {}); }'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'function* g() { it(yield foo, function () {}); }'
        },

        'notTest()',

        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(string`template`, function () {});'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(`template strings`, function () {});'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(`${foo} template strings`, function () {});'
        },
        {
            options: [ { testNames: [ 'someFunction' ] } ],
            code: 'someFunction("this is a test", function () { });'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'const dynamicTitle = "foo"; it(dynamicTitle, function() {});'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'const dynamicTitle = "foo"; it(dynamicTitle.replace("foo", ""), function() {});'
        }
    ],

    invalid: [
        {
            code: 'test()',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        },
        {
            code: 'test(function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        },
        {
            code: 'test("", function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        },
        {
            code: 'test("      ", function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        },

        {
            options: [ { testNames: [ 'someFunction' ], message: 'Custom Error' } ],
            code: 'someFunction(function() { })',
            errors: [ { message: 'Custom Error', ...firstLine } ]
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(` `, function () { });',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'const foo = ""; it(foo);',
            errors: [ { message: defaultErrorMessage, line: 1, column: 17 } ]
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'const foo = { bar: "" }; it(foo.bar);',
            errors: [ { message: defaultErrorMessage, line: 1, column: 26 } ]
        },
        {
            parserOptions: { ecmaVersion: 2020 },
            code: 'it(foo?.bar);',
            errors: [ { message: defaultErrorMessage, line: 1, column: 1 } ]
        }
    ]

});

