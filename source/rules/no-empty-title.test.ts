import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noEmptyTitleRule } from './no-empty-title.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

const defaultErrorMessage = 'Unexpected empty test description.';
const firstLine = { column: 1, line: 1 };

ruleTester.run('no-empty-title', noEmptyTitleRule, {
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

        withInterface('TDD', 'suite("some text")'),
        withInterface('TDD', 'suite.only("some text")'),
        withInterface('TDD', 'suite("some text", function() { })'),

        withInterface('TDD', 'test("some text")'),
        withInterface('TDD', 'test.only("some text")'),
        withInterface('TDD', 'test("some text", function() { })'),

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
            code: 'it(foo ?? "bar", function() { })',
            languageOptions: { ecmaVersion: 2020 }
        },
        'it(foo || "bar", function() { })',
        'it(foo ? "bar" : "baz", function() { })',
        'it(foo ? bar : baz, function() { })',
        'it(typeof foo, function() { })',
        'it(foo + bar, function() { })',
        'it("foo" + "bar", function() { })',
        {
            code: 'it(...args)',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: 'async function a() { it(await foo, function () {}); }',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: 'function* g() { it(yield foo, function () {}); }',
            languageOptions: { ecmaVersion: 2019 }
        },

        'notTest()',

        {
            code: 'it(string`template`, function () {});',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: 'it(`template strings`, function () {});',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: [ 'it(`', '{foo} template strings`, function () {});' ].join('$'),
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: 'someFunction("this is a test", function () { });',
            name: 'allows titled custom test calls',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'const dynamicTitle = "foo"; it(dynamicTitle, function() {});',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: 'const dynamicTitle = "foo"; it(dynamicTitle.replace("foo", ""), function() {});',
            languageOptions: { ecmaVersion: 2019 }
        }
    ],

    invalid: [
        withInterface('TDD', {
            code: 'test()',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        }),
        withInterface('TDD', {
            code: 'test(function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        }),
        withInterface('TDD', {
            code: 'test("", function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        }),
        withInterface('TDD', {
            code: 'test("      ", function() { })',
            errors: [ { message: defaultErrorMessage, ...firstLine } ]
        }),

        {
            code: 'someFunction(function() { })',
            options: [ { message: 'Custom Error' } ],
            errors: [ { message: 'Custom Error', ...firstLine, line: 1, column: 1, endLine: 1, endColumn: 29 } ],
            name: 'reports custom tests without a title argument',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'it(` `, function () { });',
            languageOptions: { ecmaVersion: 2019 },
            errors: [ { message: defaultErrorMessage, ...firstLine, line: 1, column: 1, endLine: 1, endColumn: 25 } ]
        },
        {
            code: 'const foo = ""; it(foo);',
            languageOptions: { ecmaVersion: 2019 },
            errors: [ { message: defaultErrorMessage, line: 1, column: 17, endLine: 1, endColumn: 24 } ]
        },
        {
            code: 'const foo = { bar: "" }; it(foo.bar);',
            languageOptions: { ecmaVersion: 2019 },
            errors: [ { message: defaultErrorMessage, line: 1, column: 26, endLine: 1, endColumn: 37 } ]
        },
        {
            code: 'it(foo?.bar);',
            languageOptions: { ecmaVersion: 2020 },
            errors: [ { message: defaultErrorMessage, line: 1, column: 1, endLine: 1, endColumn: 13 } ]
        }
    ]
});
