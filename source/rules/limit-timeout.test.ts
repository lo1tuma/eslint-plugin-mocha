import { Linter, RuleTester } from 'eslint';
import assert from 'node:assert';
import { withInterface } from '../mocha-interface-test-cases.js';
import { hasMemberCallee, limitTimeoutRule } from './limit-timeout.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const unexpectedTimeout = 'Unexpected use of Mocha timeout configuration.';
const unexpectedDisabledTimeout = 'Unexpected disabled Mocha timeout.';

ruleTester.run('limit-timeout', limitTimeoutRule, {
    valid: [
        'it("works", function () {});',
        'it("works", function () {}).slow(5000);',
        {
            code: 'it("works", function () {}).timeout();',
            options: [{ mode: 'max', max: 5000 }]
        },
        {
            code: 'it("works", function () {}).timeout(5000);',
            options: [{ mode: 'max', max: 5000 }]
        },
        {
            code: 'describe("suite", function () { this.timeout(5000); });',
            options: [{ mode: 'max', max: 5000 }]
        },
        {
            code: 'it("works", function () { this["timeout"](5000); });',
            options: [{ mode: 'range', min: 1, max: 5000 }]
        },
        {
            code: 'it("works", function () { (() => this.timeout(5000))(); });',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'range', min: 1, max: 5000 }]
        },
        {
            code: 'it("works", function () { function later() { this.timeout(0); } });',
            options: [{ mode: 'disallowDisabled' }]
        },
        {
            code: 'const configuredTimeout = 5000; it("works", function () {}).timeout(configuredTimeout);',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'max', max: 5000 }]
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).timeout(5000);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            options: [{ mode: 'max', max: 5000 }],
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).timeout(5000);',
            options: [{ mode: 'max', max: 5000 }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        withInterface('TDD', {
            code: 'test("works", function () {}).timeout(5000);',
            options: [{ mode: 'range', min: 1, max: 5000 }]
        })
    ],

    invalid: [
        {
            code: 'it("works", function () {}).timeout(5000);',
            errors: [{ message: unexpectedTimeout }]
        },
        {
            code: 'describe("suite", function () { this.timeout(5000); });',
            errors: [{ message: unexpectedTimeout }]
        },
        {
            code: 'it("works", function () { (() => this.timeout(5000))(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [{ message: unexpectedTimeout }]
        },
        {
            code: 'it("works", function () {}).timeout(0);',
            options: [{ mode: 'disallowDisabled' }],
            errors: [{ message: unexpectedDisabledTimeout }]
        },
        {
            code: 'it("works", function () { this.timeout(-1); });',
            options: [{ mode: 'disallowDisabled' }],
            errors: [{ message: unexpectedDisabledTimeout }]
        },
        {
            code: 'const disabledTimeout = 2147483647; it("works", function () {}).timeout(disabledTimeout);',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'disallowDisabled' }],
            errors: [{ message: unexpectedDisabledTimeout }]
        },
        {
            code: 'it("works", function () {}).timeout(5001);',
            options: [{ mode: 'max', max: 5000 }],
            errors: [{
                message: 'Unexpected Mocha timeout value 5001. Maximum allowed is 5000.'
            }]
        },
        {
            code: 'const configuredTimeout = 5001; it("works", function () {}).timeout(configuredTimeout);',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'max', max: 5000 }],
            errors: [{
                message: 'Unexpected Mocha timeout value 5001. Maximum allowed is 5000.'
            }]
        },
        {
            code: 'it("works", function () {}).timeout(0);',
            options: [{ mode: 'range', min: 1, max: 5000 }],
            errors: [{
                message: 'Unexpected Mocha timeout value 0. Expected a value between 1 and 5000.'
            }]
        },
        {
            code: 'describe("suite", function () { this["timeout"](6000); });',
            options: [{ mode: 'range', min: 1, max: 5000 }],
            errors: [{
                message: 'Unexpected Mocha timeout value 6000. Expected a value between 1 and 5000.'
            }]
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).timeout(5000);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'require' } },
            errors: [{ message: unexpectedTimeout }]
        },
        {
            code: 'custom("works", function () {}).timeout(5000);',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: unexpectedTimeout }]
        }
    ]
});

describe('limit-timeout', function () {
    it('hasMemberCallee() rejects non-member callees', function () {
        assert.strictEqual(
            hasMemberCallee({
                callee: {
                    type: 'Identifier'
                }
            } as never),
            false
        );
    });

    it('accepts ranges where min and max are equal', function () {
        const linter = new Linter();
        const messages = linter.verify('it("works", function () {}).timeout(5);', {
            plugins: { 'test-plugin': { rules: { 'limit-timeout': limitTimeoutRule } } },
            languageOptions: { sourceType: 'script' },
            rules: {
                'test-plugin/limit-timeout': ['error', { mode: 'range', min: 5, max: 5 }]
            }
        });

        assert.deepStrictEqual(messages, []);
    });

    it('throws when the configured range is invalid', function () {
        const linter = new Linter();

        assert.throws(
            function () {
                linter.verify('it("works", function () {}).timeout(5000);', {
                    plugins: { 'test-plugin': { rules: { 'limit-timeout': limitTimeoutRule } } },
                    languageOptions: { sourceType: 'script' },
                    rules: {
                        'test-plugin/limit-timeout': ['error', { mode: 'range', min: 10, max: 1 }]
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
