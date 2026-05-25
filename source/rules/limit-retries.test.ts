import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { limitRetriesRule } from './limit-retries.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const unexpectedRetries = 'Unexpected use of Mocha retry configuration.';

ruleTester.run('limit-retries', limitRetriesRule, {
    valid: [
        'it("works", function () {});',
        'it("works", function () {}).timeout(5000);',
        {
            code: 'it("works", function () {}).retries();',
            options: [{ mode: 'max', max: 2 }]
        },
        {
            code: 'describe("suite", function () { this.retries(2); });',
            options: [{ mode: 'max', max: 2 }]
        },
        {
            code: 'it("works", function () { this["retries"](2); });',
            options: [{ mode: 'range', min: 0, max: 2 }]
        },
        {
            code: 'it("works", function () { (() => this.retries(2))(); });',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'range', min: 0, max: 2 }]
        },
        {
            code: 'it("works", function () { function later() { this.retries(3); } });',
            options: [{ mode: 'max', max: 2 }]
        },
        {
            code: 'const retryLimit = 2; it("works", function () {}).retries(retryLimit);',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'max', max: 2 }]
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).retries(2);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            options: [{ mode: 'max', max: 2 }],
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'custom("works", function () {}).retries(2);',
            options: [{ mode: 'max', max: 2 }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            }
        },
        withInterface('TDD', {
            code: 'test("works", function () {}).retries(2);',
            options: [{ mode: 'range', min: 0, max: 2 }]
        })
    ],

    invalid: [
        {
            code: 'it("works", function () {}).retries(2);',
            errors: [{ message: unexpectedRetries }]
        },
        {
            code: 'describe("suite", function () { this.retries(2); });',
            errors: [{ message: unexpectedRetries }]
        },
        {
            code: 'it("works", function () { (() => this.retries(2))(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [{ message: unexpectedRetries }]
        },
        {
            code: 'it("works", function () {}).retries(3);',
            options: [{ mode: 'max', max: 2 }],
            errors: [{
                message: 'Unexpected Mocha retry value 3. Maximum allowed is 2.'
            }]
        },
        {
            code: 'const retryLimit = 3; it("works", function () {}).retries(retryLimit);',
            languageOptions: { ecmaVersion: 2015 },
            options: [{ mode: 'max', max: 2 }],
            errors: [{
                message: 'Unexpected Mocha retry value 3. Maximum allowed is 2.'
            }]
        },
        {
            code: 'it("works", function () {}).retries(-1);',
            options: [{ mode: 'range', min: 0, max: 2 }],
            errors: [{
                message: 'Unexpected Mocha retry value -1. Expected a value between 0 and 2.'
            }]
        },
        {
            code: 'describe("suite", function () { this["retries"](3); });',
            options: [{ mode: 'range', min: 0, max: 2 }],
            errors: [{
                message: 'Unexpected Mocha retry value 3. Expected a value between 0 and 2.'
            }]
        },
        {
            code: 'import { it } from "mocha"; it("works", function () {}).retries(2);',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            settings: { mocha: { interface: 'require' } },
            errors: [{ message: unexpectedRetries }]
        },
        {
            code: 'custom("works", function () {}).retries(2);',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{ message: unexpectedRetries }]
        }
    ]
});
