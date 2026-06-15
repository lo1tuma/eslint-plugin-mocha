import assert from 'node:assert';
import { Linter, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { limitSlowRule } from './limit-slow.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const unexpectedSlow = 'Unexpected use of Mocha slow threshold configuration.';

ruleTester.run('limit-slow', limitSlowRule, {
    valid: [
        'it("works", function () {});',
        'slow(500);',
        'it("works", function () {}).timeout(5000);',
        {
            code: 'it("works", function () {}).slow();',
            options: [ { mode: 'max', max: 200 } ],
            name: 'allows slow calls without configured values'
        },
        {
            code: 'describe("suite", function () { this.slow(200); });',
            options: [ { mode: 'max', max: 200 } ],
            name: 'allows suite slow values at the maximum'
        },
        {
            code: 'it("works", function () { this["slow"](200); });',
            options: [ { mode: 'range', min: 50, max: 200 } ],
            name: 'allows computed slow calls inside the configured range'
        },
        {
            code: 'it("works", function () { (() => this.slow(200))(); });',
            options: [ { mode: 'range', min: 50, max: 200 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'ignores slow calls inside nested functions'
        },
        {
            code: 'it("works", function () { function later() { this.slow(300); } });',
            options: [ { mode: 'max', max: 200 } ],
            name: 'ignores out-of-range slow calls inside nested functions'
        },
        {
            code: 'const slowThreshold = 200; it("works", function () {}).slow(slowThreshold);',
            options: [ { mode: 'max', max: 200 } ],
            languageOptions: { ecmaVersion: 2015 },
            name: 'allows static slow constants at the maximum'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).slow(200);',
            options: [ { mode: 'max', max: 200 } ],
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'allows required test slow values at the maximum',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).slow(200);',
            options: [ { mode: 'max', max: 200 } ],
            name: 'allows custom test slow values at the maximum',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        withInterface('TDD', {
            code: 'test("works", function () {}).slow(200);',
            options: [ { mode: 'range', min: 50, max: 200 } ]
        })
    ],

    invalid: [
        {
            code: 'it("works", function () {}).slow(200);',
            errors: [ { message: unexpectedSlow, line: 1, column: 1, endLine: 1, endColumn: 38 } ]
        },
        {
            code: 'describe("suite", function () { this.slow(200); });',
            errors: [ { message: unexpectedSlow, line: 1, column: 33, endLine: 1, endColumn: 47 } ]
        },
        {
            code: 'it("works", function () { (() => this.slow(200))(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [ { message: unexpectedSlow, line: 1, column: 34, endLine: 1, endColumn: 48 } ]
        },
        {
            code: 'it("works", function () {}).slow(300);',
            options: [ { mode: 'max', max: 200 } ],
            errors: [ {
                message: 'Unexpected Mocha slow value 300. Maximum allowed is 200.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 38
            } ],
            name: 'reports slow values above the maximum'
        },
        {
            code: 'const slowThreshold = 300; it("works", function () {}).slow(slowThreshold);',
            options: [ { mode: 'max', max: 200 } ],
            languageOptions: { ecmaVersion: 2015 },
            errors: [ {
                message: 'Unexpected Mocha slow value 300. Maximum allowed is 200.',
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 75
            } ],
            name: 'reports static slow constants above the maximum'
        },
        {
            code: 'it("works", function () {}).slow(25);',
            options: [ { mode: 'range', min: 50, max: 200 } ],
            errors: [ {
                message: 'Unexpected Mocha slow value 25. Expected a value between 50 and 200.',
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 37
            } ],
            name: 'reports slow values below the configured range'
        },
        {
            code: 'describe("suite", function () { this["slow"](250); });',
            options: [ { mode: 'range', min: 50, max: 200 } ],
            errors: [ {
                message: 'Unexpected Mocha slow value 250. Expected a value between 50 and 200.',
                line: 1,
                column: 33,
                endLine: 1,
                endColumn: 50
            } ],
            name: 'reports computed slow calls above the configured range'
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).slow(200);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ { message: unexpectedSlow, line: 1, column: 29, endLine: 1, endColumn: 66 } ],
            name: 'reports required test slow calls without explicit options',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).slow(200);',
            errors: [ { message: unexpectedSlow, line: 1, column: 1, endLine: 1, endColumn: 42 } ],
            name: 'reports custom test slow calls without explicit options',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        }
    ]
});

suite('limit-slow', function () {
    test('throws when the configured range is invalid', function () {
        const linter = new Linter();

        assert.throws(
            function () {
                linter.verify('it("works", function () {}).slow(200);', {
                    plugins: { 'test-plugin': { rules: { 'limit-slow': limitSlowRule } } },
                    languageOptions: { sourceType: 'script' },
                    rules: {
                        'test-plugin/limit-slow': [ 'error', { mode: 'range', min: 200, max: 50 } ]
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
