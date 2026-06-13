import assert from 'node:assert';
import { RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { validSuiteTitleRule } from './valid-suite-title.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-suite-title', validSuiteTitleRule, {
    valid: [
        {
            code: 'describe("This is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'valid case 1'
        },
        {
            code: 'context("This is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'valid case 2'
        },
        withInterface('TDD', {
            options: [ { pattern: '^[A-Z]' } ],
            code: 'suite("This is a test", function () { });'
        }),
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'valid case 3',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ { pattern: '^[A-Z]', message: 'some error message' } ],
            name: 'valid case 4'
        },
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ {} ],
            name: 'valid case 5'
        },
        'someOtherFunction();',
        {
            code: 'describe(`Foo with template strings`, function () {});',
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2017 },
            name: 'valid case 6'
        },
        {
            code: 'describe(anyTag`with template strings`, function () {});',
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2019 },
            name: 'valid case 7'
        },
        {
            code: [ 'describe(`', '{dynamicVar} with template strings`, function () {});' ].join('$'),
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2019 },
            name: 'valid case 8'
        },
        {
            code: 'describe();',
            options: [ { pattern: '^Foo' } ],
            name: 'valid case 9'
        },
        {
            code: 'describe("😀", function () { });',
            options: [ { pattern: '^.$' } ],
            name: 'valid case 10'
        }
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 1, endLine: 1, endColumn: 44 }
            ],
            name: 'invalid case 1'
        },
        {
            code: 'context("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            errors: [
                { message: 'Invalid "context()" description found.', line: 1, column: 1, endLine: 1, endColumn: 43 }
            ],
            name: 'invalid case 2'
        },
        withInterface('TDD', {
            options: [ { pattern: '^[A-Z]' } ],
            code: 'suite("this is a test", function () { });',
            errors: [
                { message: 'Invalid "suite()" description found.' }
            ]
        }),
        {
            code: 'customFunction("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
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
                    additionalCustomNames: [ { name: 'customFunction', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'customFunction("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]', message: 'some error message' } ],
            errors: [
                { message: 'some error message', line: 1, column: 1, endLine: 1, endColumn: 50 }
            ],
            name: 'invalid case 4',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'customFunction', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe(`this is a test`, function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 1, endLine: 1, endColumn: 44 }
            ],
            name: 'invalid case 5'
        },
        {
            code: [ 'const foo = "this"; describe(`', '{foo} is a test`, function () { });' ].join('$'),
            options: [ { pattern: '^[A-Z]' } ],
            languageOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 21, endLine: 1, endColumn: 66 }
            ],
            name: 'invalid case 6'
        }
    ]
});

suite('valid-suite-title metadata', function () {
    test('should default to an empty title pattern', function () {
        assert.deepStrictEqual(validSuiteTitleRule.meta?.defaultOptions, [ { pattern: '' } ]);
    });
});
