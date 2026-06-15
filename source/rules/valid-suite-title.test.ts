import assert from 'node:assert';
import { RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.ts';
import { validSuiteTitleRule } from './valid-suite-title.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('valid-suite-title', validSuiteTitleRule, {
    valid: [
        {
            code: 'describe("This is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'accepts describe titles matching the configured pattern'
        },
        {
            code: 'context("This is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'accepts context titles matching the configured pattern'
        },
        withInterface('TDD', {
            options: [ { pattern: '^[A-Z]' } ],
            code: 'suite("This is a test", function () { });'
        }),
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            name: 'accepts custom suite titles matching the configured pattern',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'someFunction', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ { pattern: '^[A-Z]', message: 'some error message' } ],
            name: 'accepts custom suite titles when a custom message is configured'
        },
        {
            code: 'someFunction("Should do something", function () { });',
            options: [ {} ],
            name: 'accepts custom suite titles with default options'
        },
        'someOtherFunction();',
        {
            code: 'describe(`Foo with template strings`, function () {});',
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2017 },
            name: 'accepts template literal suite titles matching the pattern'
        },
        {
            code: 'describe(anyTag`with template strings`, function () {});',
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2019 },
            name: 'ignores tagged template suite titles'
        },
        {
            code: [ 'describe(`', '{dynamicVar} with template strings`, function () {});' ].join('$'),
            options: [ { pattern: '^Foo' } ],
            languageOptions: { ecmaVersion: 2019 },
            name: 'ignores dynamic template literal suite titles'
        },
        {
            code: 'describe();',
            options: [ { pattern: '^Foo' } ],
            name: 'allows suites without titles'
        },
        {
            code: 'describe("😀", function () { });',
            options: [ { pattern: '^.$' } ],
            name: 'matches unicode suite titles by code point'
        }
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            errors: [
                { message: 'Invalid "describe()" description found.', line: 1, column: 1, endLine: 1, endColumn: 44 }
            ],
            name: 'reports describe titles that do not match the pattern'
        },
        {
            code: 'context("this is a test", function () { });',
            options: [ { pattern: '^[A-Z]' } ],
            errors: [
                { message: 'Invalid "context()" description found.', line: 1, column: 1, endLine: 1, endColumn: 43 }
            ],
            name: 'reports context titles that do not match the pattern'
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
            name: 'reports custom suite titles that do not match the pattern',
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
            name: 'uses custom messages for invalid custom suite titles',
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
            name: 'reports template literal suite titles that do not match the pattern'
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
            name: 'reports dynamic template literal suite titles after constant folding'
        }
    ]
});

suite('valid-suite-title metadata', function () {
    test('should default to an empty title pattern', function () {
        assert.deepStrictEqual(validSuiteTitleRule.meta?.defaultOptions, [ { pattern: '' } ]);
    });
});
