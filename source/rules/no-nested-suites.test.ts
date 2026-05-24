import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noNestedSuitesRule } from './no-nested-suites.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-nested-suites', noNestedSuitesRule, {
    valid: [
        'describe("", function () { it(); });',
        'describe(""); describe("");',
        'it("", function () { it(); });',
        withInterface('TDD', 'suite("", function () { test(); });'),
        {
            code: 'foo("", function () { it(); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe("", function () { describe(); });',
            errors: [{
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 28
            }]
        },
        {
            code: 'context("", function () { describe(); });',
            errors: [{
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 27
            }]
        },
        withInterface('TDD', {
            code: 'suite("", function () { suite(); });',
            errors: [{
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 25
            }]
        }),
        {
            code: 'describe("", function () { describe("", function () { describe(); }); });',
            errors: [
                {
                    message: 'Unexpected suite nested within another suite.',
                    line: 1,
                    column: 28
                },
                {
                    message: 'Unexpected suite nested within another suite.',
                    line: 1,
                    column: 55
                }
            ]
        },
        {
            code: 'describe("", function () { foo(); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 28
            }]
        }
    ]
});
