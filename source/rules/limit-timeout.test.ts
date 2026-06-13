import assert from 'node:assert';
import { Linter, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { limitTimeoutRule } from './limit-timeout.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const unexpectedTimeout = 'Unexpected use of Mocha timeout configuration.';
const unexpectedDisabledTimeout = 'Unexpected disabled Mocha timeout.';

ruleTester.run('limit-timeout', limitTimeoutRule, {
    valid: [
        'it("works", function () {});',
        'timeout(5000);',
        'it("works", function () {}).slow(5000);',
        {
            code: 'it("works", function () {}).timeout();',
            options: [ { mode: 'max', max: 5000 } ],
            name: 'valid case 1'
        },
        {
            code: 'it("works", function () {}).timeout(5000);',
            options: [ { mode: 'max', max: 5000 } ],
            name: 'valid case 2'
        },
        {
            code: 'describe("suite", function () { this.timeout(5000); });',
            options: [ { mode: 'max', max: 5000 } ],
            name: 'valid case 3'
        },
        {
            code: 'it("works", function () { this["timeout"](5000); });',
            options: [ { mode: 'range', min: 1, max: 5000 } ],
            name: 'valid case 4'
        },
        {
            code: 'it("works", function () { (() => this.timeout(5000))(); });',
            options: [ { mode: 'range', min: 1, max: 5000 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'valid case 5'
        },
        {
            code: 'it("works", function () { function later() { this.timeout(0); } });',
            options: [ { mode: 'disallowDisabled' } ],
            name: 'valid case 6'
        },
        {
            code: 'const configuredTimeout = 5000; it("works", function () {}).timeout(configuredTimeout);',
            options: [ { mode: 'max', max: 5000 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'valid case 7'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).timeout(5000);',
            options: [ { mode: 'max', max: 5000 } ],
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'valid case 8',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).timeout(5000);',
            options: [ { mode: 'max', max: 5000 } ],
            name: 'valid case 9',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        withInterface('TDD', {
            code: 'test("works", function () {}).timeout(5000);',
            options: [ { mode: 'range', min: 1, max: 5000 } ]
        })
    ],

    invalid: [
        {
            code: 'it("works", function () {}).timeout(5000);',
            errors: [ { message: unexpectedTimeout, line: 1, column: 1, endLine: 1, endColumn: 42 } ]
        },
        {
            code: 'describe("suite", function () { this.timeout(5000); });',
            errors: [ { message: unexpectedTimeout, line: 1, column: 33, endLine: 1, endColumn: 51 } ]
        },
        {
            code: 'it("works", function () { (() => this.timeout(5000))(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [ { message: unexpectedTimeout, line: 1, column: 34, endLine: 1, endColumn: 52 } ]
        },
        {
            code: 'it("works", function () {}).timeout(0);',
            options: [ { mode: 'disallowDisabled' } ],
            errors: [ { message: unexpectedDisabledTimeout, line: 1, column: 1, endLine: 1, endColumn: 39 } ],
            name: 'invalid case 1'
        },
        {
            code: 'it("works", function () { this.timeout(-1); });',
            options: [ { mode: 'disallowDisabled' } ],
            errors: [ { message: unexpectedDisabledTimeout, line: 1, column: 27, endLine: 1, endColumn: 43 } ],
            name: 'invalid case 2'
        },
        {
            code: 'const disabledTimeout = 2147483647; it("works", function () {}).timeout(disabledTimeout);',
            options: [ { mode: 'disallowDisabled' } ],
            languageOptions: { ecmaVersion: 2015 },
            errors: [ { message: unexpectedDisabledTimeout, line: 1, column: 37, endLine: 1, endColumn: 89 } ],
            name: 'invalid case 3'
        },
        {
            code: 'it("works", function () {}).timeout(5001);',
            options: [ { mode: 'max', max: 5000 } ],
            errors: [ {
                message: 'Unexpected Mocha timeout value 5001. Maximum allowed is 5000.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 42
            } ],
            name: 'invalid case 4'
        },
        {
            code: 'const configuredTimeout = 5001; it("works", function () {}).timeout(configuredTimeout);',
            options: [ { mode: 'max', max: 5000 } ],
            languageOptions: { ecmaVersion: 2015 },
            errors: [ {
                message: 'Unexpected Mocha timeout value 5001. Maximum allowed is 5000.',
                line: 1,
                column: 33,
                endLine: 1,
                endColumn: 87
            } ],
            name: 'invalid case 5'
        },
        {
            code: 'it("works", function () {}).timeout(0);',
            options: [ { mode: 'range', min: 1, max: 5000 } ],
            errors: [ {
                message: 'Unexpected Mocha timeout value 0. Expected a value between 1 and 5000.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 39
            } ],
            name: 'invalid case 6'
        },
        {
            code: 'describe("suite", function () { this["timeout"](6000); });',
            options: [ { mode: 'range', min: 1, max: 5000 } ],
            errors: [ {
                message: 'Unexpected Mocha timeout value 6000. Expected a value between 1 and 5000.',
                line: 1,
                column: 33,
                endLine: 1,
                endColumn: 54
            } ],
            name: 'invalid case 7'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).timeout(5000);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ { message: unexpectedTimeout, line: 1, column: 29, endLine: 1, endColumn: 70 } ],
            name: 'invalid case 8',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).timeout(5000);',
            errors: [ { message: unexpectedTimeout, line: 1, column: 1, endLine: 1, endColumn: 46 } ],
            name: 'invalid case 9',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        }
    ]
});

suite('limit-timeout', function () {
    test('accepts ranges where min and max are equal', function () {
        const linter = new Linter();
        const messages = linter.verify('it("works", function () {}).timeout(5);', {
            plugins: { 'test-plugin': { rules: { 'limit-timeout': limitTimeoutRule } } },
            languageOptions: { sourceType: 'script' },
            rules: {
                'test-plugin/limit-timeout': [ 'error', { mode: 'range', min: 5, max: 5 } ]
            }
        });

        assert.deepStrictEqual(messages, []);
    });

    test('throws when the configured range is invalid', function () {
        const linter = new Linter();

        assert.throws(
            function () {
                linter.verify('it("works", function () {}).timeout(5000);', {
                    plugins: { 'test-plugin': { rules: { 'limit-timeout': limitTimeoutRule } } },
                    languageOptions: { sourceType: 'script' },
                    rules: {
                        'test-plugin/limit-timeout': [ 'error', { mode: 'range', min: 10, max: 1 } ]
                    }
                });
            },
            function (error: unknown) {
                return error instanceof Error &&
                    error.message.includes('`min` must be less than or equal to `max`.');
            }
        );
    });
});
