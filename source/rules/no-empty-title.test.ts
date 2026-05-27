import { RuleTester } from 'eslint';
import assert from 'node:assert';
import { withInterface } from '../mocha-interface-test-cases.js';
import { isStaticallyAnalyzableDescription, noEmptyTitleRule } from './no-empty-title.js';

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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'someFunction', type: 'testCase', interface: 'BDD' }]
                }
            },
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
        withInterface('TDD', {
            code: 'test()',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        }),
        withInterface('TDD', {
            code: 'test(function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        }),
        withInterface('TDD', {
            code: 'test("", function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        }),
        withInterface('TDD', {
            code: 'test("      ", function() { })',
            errors: [{ message: defaultErrorMessage, ...firstLine }]
        }),

        {
            options: [{ message: 'Custom Error' }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'someFunction', type: 'testCase', interface: 'BDD' }]
                }
            },
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

describe('no-empty-title helpers', function () {
    it('isStaticallyAnalyzableDescription() treats literals without extracted text as analyzable', function () {
        assert.strictEqual(isStaticallyAnalyzableDescription({ type: 'Literal' } as never, null), true);
    });
});
