import assert from 'node:assert';
import { Linter, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { limitRetriesRule } from './limit-retries.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const unexpectedRetries = 'Unexpected use of Mocha retry configuration.';

ruleTester.run('limit-retries', limitRetriesRule, {
    valid: [
        'it("works", function () {});',
        'retries(2);',
        'it("works", function () {}).timeout(5000);',
        {
            code: 'it("works", function () {}).retries();',
            options: [ { mode: 'max', max: 2 } ],
            name: 'allows retries calls without configured values'
        },
        {
            code: 'describe("suite", function () { this.retries(2); });',
            options: [ { mode: 'max', max: 2 } ],
            name: 'allows suite retry values at the maximum'
        },
        {
            code: 'it("works", function () { this["retries"](2); });',
            options: [ { mode: 'range', min: 0, max: 2 } ],
            name: 'allows computed retries calls inside the configured range'
        },
        {
            code: 'it("works", function () { (() => this.retries(2))(); });',
            options: [ { mode: 'range', min: 0, max: 2 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'ignores retries calls inside nested functions'
        },
        {
            code: 'it("works", function () { function later() { this.retries(3); } });',
            options: [ { mode: 'max', max: 2 } ],
            name: 'ignores out-of-range retries calls inside nested functions'
        },
        {
            code: 'const retryLimit = 2; it("works", function () {}).retries(retryLimit);',
            options: [ { mode: 'max', max: 2 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'allows static retry constants at the maximum'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).retries(2);',
            options: [ { mode: 'max', max: 2 } ],
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'allows required test retry values at the maximum',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).retries(2);',
            options: [ { mode: 'max', max: 2 } ],
            name: 'allows custom test retry values at the maximum',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        withInterface('TDD', {
            code: 'test("works", function () {}).retries(2);',
            options: [ { mode: 'range', min: 0, max: 2 } ]
        })
    ],

    invalid: [
        {
            code: 'it("works", function () {}).retries(2);',
            errors: [ { message: unexpectedRetries, line: 1, column: 1, endLine: 1, endColumn: 39 } ]
        },
        {
            code: 'describe("suite", function () { this.retries(2); });',
            errors: [ { message: unexpectedRetries, line: 1, column: 33, endLine: 1, endColumn: 48 } ]
        },
        {
            code: 'it("works", function () { (() => this.retries(2))(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [ { message: unexpectedRetries, line: 1, column: 34, endLine: 1, endColumn: 49 } ]
        },
        {
            code: 'it("works", function () {}).retries(3);',
            options: [ { mode: 'max', max: 2 } ],
            errors: [ {
                message: 'Unexpected Mocha retry value 3. Maximum allowed is 2.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 39
            } ],
            name: 'reports retry values above the maximum'
        },
        {
            code: 'const retryLimit = 3; it("works", function () {}).retries(retryLimit);',
            options: [ { mode: 'max', max: 2 } ],
            languageOptions: { ecmaVersion: 2015 },
            errors: [ {
                message: 'Unexpected Mocha retry value 3. Maximum allowed is 2.',
                line: 1,
                column: 23,
                endLine: 1,
                endColumn: 70
            } ],
            name: 'reports static retry constants above the maximum'
        },
        {
            code: 'it("works", function () {}).retries(-1);',
            options: [ { mode: 'range', min: 0, max: 2 } ],
            errors: [ {
                message: 'Unexpected Mocha retry value -1. Expected a value between 0 and 2.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 40
            } ],
            name: 'reports retry values below the configured range'
        },
        {
            code: 'describe("suite", function () { this["retries"](3); });',
            options: [ { mode: 'range', min: 0, max: 2 } ],
            errors: [ {
                message: 'Unexpected Mocha retry value 3. Expected a value between 0 and 2.',
                line: 1,
                column: 33,
                endLine: 1,
                endColumn: 51
            } ],
            name: 'reports computed retries calls above the configured range'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).retries(2);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ { message: unexpectedRetries, line: 1, column: 29, endLine: 1, endColumn: 67 } ],
            name: 'reports required test retries calls without explicit options',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).retries(2);',
            errors: [ { message: unexpectedRetries, line: 1, column: 1, endLine: 1, endColumn: 43 } ],
            name: 'reports custom test retries calls without explicit options',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        }
    ]
});

suite('limit-retries', function () {
    test('throws when the configured range is invalid', function () {
        const linter = new Linter();

        assert.throws(
            function () {
                linter.verify('it("works", function () {}).retries(2);', {
                    plugins: { 'test-plugin': { rules: { 'limit-retries': limitRetriesRule } } },
                    languageOptions: { sourceType: 'script' },
                    rules: {
                        'test-plugin/limit-retries': [ 'error', { mode: 'range', min: 2, max: 1 } ]
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
