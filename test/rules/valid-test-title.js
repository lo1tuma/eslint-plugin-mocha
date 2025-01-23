import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-test-title', plugin.rules['valid-test-title'], {
    valid: [
        'it("should respond to GET", function() { });',
        'it("should do something");',
        'specify("should respond to GET", function() { });',
        'specify("should do something");',
        'test("should respond to GET", function() { });',
        'test("should do something");',
        'it();',
        'specify();',
        'test();',
        {
            options: [{ pattern: 'test' }],
            code: 'test("this is a test", function () { });'
        },
        {
            options: [{ pattern: '^should' }],
            code: 'someFunction("should do something", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'someFunction', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        {
            options: [{ pattern: '^should', message: 'some error message' }],
            code: 'someFunction("should do something", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'someFunction', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        'someOtherFunction();',
        {
            languageOptions: { ecmaVersion: 2017 },
            code: 'it(`should work with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(foo`work with template strings`, function () {});'
        },
        {
            languageOptions: { ecmaVersion: 2019 },
            code: 'it(`${foo} work with template strings`, function () {});'
        }
    ],

    invalid: [
        {
            code: 'it("does something", function() { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            code: 'specify("does something", function() { });',
            errors: [
                { message: 'Invalid "specify()" description found.' }
            ]
        },
        {
            code: 'test("does something", function() { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        },
        {
            options: [{ pattern: 'required' }],
            code: 'it("this is a test", function () { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            options: [{ pattern: 'required' }],
            code: 'specify("this is a test", function () { });',
            errors: [
                { message: 'Invalid "specify()" description found.' }
            ]
        },
        {
            options: [{ pattern: 'required' }],
            code: 'test("this is a test", function () { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        },
        {
            options: [{ pattern: 'required' }],
            code: 'customFunction("this is a test", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'customFunction', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        },
        {
            options: [{ pattern: 'required', message: 'some error message' }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'customFunction', type: 'testCase', interface: 'BDD' }]
                }
            },
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: [{}],
            code: 'it("this is a test", function () { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            code: 'it(`this is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1 }
            ]
        },
        {
            code: 'const foo = "this"; it(`${foo} is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 21 }
            ]
        }
    ]
});
