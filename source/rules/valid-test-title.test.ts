import assert from 'node:assert';
import { RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { validTestTitleRule } from './valid-test-title.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-test-title', validTestTitleRule, {
    valid: [
        'it("should respond to GET", function() { });',
        'it("should do something");',
        'specify("should respond to GET", function() { });',
        'specify("should do something");',
        withInterface('TDD', 'test("should respond to GET", function() { });'),
        withInterface('TDD', 'test("should do something");'),
        'it();',
        'specify();',
        withInterface('TDD', 'test();'),
        withInterface('TDD', {
            options: [ { pattern: 'test' } ],
            code: 'test("this is a test", function () { });'
        }),
        {
            code: 'someFunction("should do something", function () { });',
            options: [ { pattern: '^should' } ],
            name: 'valid case 1',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'someFunction("should do something", function () { });',
            options: [ { pattern: '^should', message: 'some error message' } ],
            name: 'valid case 2',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        'someOtherFunction();',
        {
            code: 'it(`should work with template strings`, function () {});',
            languageOptions: { ecmaVersion: 2017 }
        },
        {
            code: 'it(foo`work with template strings`, function () {});',
            languageOptions: { ecmaVersion: 2019 }
        },
        {
            code: [ 'it(`', '{foo} work with template strings`, function () {});' ].join('$'),
            languageOptions: { ecmaVersion: 2019 }
        }
    ],

    invalid: [
        {
            code: 'it("does something", function() { });',
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1, endLine: 1, endColumn: 37 }
            ]
        },
        {
            code: 'specify("does something", function() { });',
            errors: [
                { message: 'Invalid "specify()" description found.', line: 1, column: 1, endLine: 1, endColumn: 42 }
            ]
        },
        withInterface('TDD', {
            code: 'test("does something", function() { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        }),
        {
            code: 'it("this is a test", function () { });',
            options: [ { pattern: 'required' } ],
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1, endLine: 1, endColumn: 38 }
            ],
            name: 'invalid case 1'
        },
        {
            code: 'specify("this is a test", function () { });',
            options: [ { pattern: 'required' } ],
            errors: [
                { message: 'Invalid "specify()" description found.', line: 1, column: 1, endLine: 1, endColumn: 43 }
            ],
            name: 'invalid case 2'
        },
        withInterface('TDD', {
            options: [ { pattern: 'required' } ],
            code: 'test("this is a test", function () { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        }),
        {
            code: 'customFunction("this is a test", function () { });',
            options: [ { pattern: 'required' } ],
            errors: [
                {
                    message: 'Invalid "customFunction()" description found.',
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 50
                }
            ],
            name: 'invalid case 3',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'customFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'customFunction("this is a test", function () { });',
            options: [ { pattern: 'required', message: 'some error message' } ],
            errors: [
                { message: 'some error message', line: 1, column: 1, endLine: 1, endColumn: 50 }
            ],
            name: 'invalid case 4',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'customFunction', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'it("this is a test", function () { });',
            options: [ {} ],
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1, endLine: 1, endColumn: 38 }
            ],
            name: 'invalid case 5'
        },
        {
            code: 'it(`this is a test`, function () { });',
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1, endLine: 1, endColumn: 38 }
            ]
        },
        {
            code: [ 'const foo = "this"; it(`', '{foo} is a test`, function () { });' ].join('$'),
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 21, endLine: 1, endColumn: 60 }
            ]
        }
    ]
});

suite('valid-test-title metadata', function () {
    test('should default to the should-pattern', function () {
        assert.deepStrictEqual(validTestTitleRule.meta?.defaultOptions, [ { pattern: '^should' } ]);
    });
});
