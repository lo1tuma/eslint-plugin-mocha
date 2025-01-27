import { RuleTester } from 'eslint';
import { validSuiteTitleRule } from './valid-suite-title.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-suite-title', validSuiteTitleRule, {
    valid: [
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'describe("This is a test", function () { });'
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'context("This is a test", function () { });'
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'suite("This is a test", function () { });'
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'someFunction', type: 'suite', interface: 'BDD' }]
                }
            },
            code: 'someFunction("Should do something", function () { });'
        },
        {
            options: [{ pattern: '^[A-Z]', message: 'some error message' }],
            code: 'someFunction("Should do something", function () { });'
        },
        {
            options: [{}],
            code: 'someFunction("Should do something", function () { });'
        },
        'someOtherFunction();',
        {
            languageOptions: { ecmaVersion: 2017 },
            options: [{ pattern: '^Foo' }],
            code: 'describe(`Foo with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            options: [{ pattern: '^Foo' }],
            code: 'describe(anyTag`with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            options: [{ pattern: '^Foo' }],
            code: 'describe(`${dynamicVar} with template strings`, function () {});'
        }
    ],

    invalid: [
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'describe("this is a test", function () { });',
            errors: [
                { message: 'Invalid "describe()" description found.' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'context("this is a test", function () { });',
            errors: [
                { message: 'Invalid "context()" description found.' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'suite("this is a test", function () { });',
            errors: [
                { message: 'Invalid "suite()" description found.' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'customFunction', type: 'suite', interface: 'BDD' }]
                }
            },
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]', message: 'some error message' }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'customFunction', type: 'suite', interface: 'BDD' }]
                }
            },
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'describe(`this is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 1 }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]' }],
            code: 'const foo = "this"; describe(`${foo} is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 21 }
            ]
        }
    ]
});
