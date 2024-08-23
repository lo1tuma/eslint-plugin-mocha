import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-suite-description', plugin.rules['valid-suite-description'], {
    valid: [
        {
            options: ['^[A-Z]'],
            code: 'describe("This is a test", function () { });'
        },
        {
            options: ['^[A-Z]'],
            code: 'context("This is a test", function () { });'
        },
        {
            options: ['^[A-Z]'],
            code: 'suite("This is a test", function () { });'
        },
        {
            options: ['^[A-Z]', ['someFunction']],
            code: 'describe("this is a test", function () { });'
        },
        {
            options: ['^[A-Z]', ['someFunction']],
            code: 'someFunction("Should do something", function () { });'
        },
        {
            options: ['^[A-Z]', ['someFunction'], 'some error message'],
            code: 'someFunction("Should do something", function () { });'
        },
        {
            options: [{ pattern: '^[A-Z]', suiteNames: ['someFunction'], message: 'some error message' }],
            code: 'someFunction("Should do something", function () { });'
        },
        {
            options: [{}],
            code: 'someFunction("Should do something", function () { });'
        },
        'someOtherFunction();',
        {
            languageOptions: { ecmaVersion: 2017 },
            options: ['^Foo'],
            code: 'describe(`Foo with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            options: ['^Foo'],
            code: 'describe(anyTag`with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            options: ['^Foo'],
            code: 'describe(`${dynamicVar} with template strings`, function () {});'
        }
    ],

    invalid: [
        {
            options: ['^[A-Z]'],
            code: 'describe("this is a test", function () { });',
            errors: [
                { message: 'Invalid "describe()" description found.' }
            ]
        },
        {
            options: ['^[A-Z]'],
            code: 'context("this is a test", function () { });',
            errors: [
                { message: 'Invalid "context()" description found.' }
            ]
        },
        {
            options: ['^[A-Z]'],
            code: 'suite("this is a test", function () { });',
            errors: [
                { message: 'Invalid "suite()" description found.' }
            ]
        },
        {
            options: ['^[A-Z]', ['customFunction']],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        },
        {
            options: ['^[A-Z]', ['customFunction'], 'some error message'],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: [{ pattern: '^[A-Z]', suiteNames: ['customFunction'], message: 'some error message' }],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: ['^[A-Z]'],
            code: 'describe(`this is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 1 }
            ]
        },
        {
            options: ['^[A-Z]'],
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
