import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

const defaultErrorMessage = 'Unexpected empty test description.';
const firstLine = { column: 1, line: 1 };

ruleTester.run('no-empty-description', plugin.rules['no-empty-description'], {
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
            languageOptions: { ecmaVersion: 2020 },
            code: 'it(foo ?? "bar", function() { })'
        },
        'it(foo || "bar", function() { })',
        'it(foo ? "bar" : "baz", function() { })',
        'it(foo ? bar : baz, function() { })',
        'it(typeof foo, function() { })',
        'it(foo + bar, function() { })',
        'it("foo" + "bar", function() { })',
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(...args)'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'async function a() { it(await foo, function () {}); }'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'function* g() { it(yield foo, function () {}); }'
        },

        'notTest()',

        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(string`template`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(`template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(`${foo} template strings`, function () {});'
        },
        {
            options: [{ testNames: ['someFunction'] }],
            code: 'someFunction("this is a test", function () { });'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'const dynamicTitle = "foo"; it(dynamicTitle, function() {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'const dynamicTitle = "foo"; it(dynamicTitle.replace("foo", ""), function() {});'
        }
    ],

    invalid: [
        {
            code: 'test()',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        },
        {
            code: 'test(function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        },
        {
            code: 'test("", function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        },
        {
            code: 'test("      ", function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        },

        {
            options: [{ testNames: ['someFunction'], message: 'Custom Error' }],
            code: 'someFunction(function() { })',
            errors: [{ message: 'Custom Error', ...firstLine }]
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(` `, function () { });',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'const foo = ""; it(foo);',
            errors: [{ message: defaultErrorMessage, line: 1, column: 17 }]
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'const foo = { bar: "" }; it(foo.bar);',
            errors: [{ message: defaultErrorMessage, line: 1, column: 26 }]
        },
        {
            languageOptions: { ecmaVersion: 2020 },
            code: 'it(foo?.bar);',
            errors: [{ message: defaultErrorMessage, line: 1, column: 1 }]
        }
    ]
});
