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
            name: 'allows custom suites with nested tests',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe("", function () { describe(); });',
            errors: [ {
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 38
            } ]
        },
        {
            code: 'context("", function () { describe(); });',
            errors: [ {
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 27,
                endLine: 1,
                endColumn: 37
            } ]
        },
        withInterface('TDD', {
            code: 'suite("", function () { suite(); });',
            errors: [ {
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 25
            } ]
        }),
        {
            code: 'describe("", function () { describe("", function () { describe(); }); });',
            errors: [
                {
                    message: 'Unexpected suite nested within another suite.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 69
                },
                {
                    message: 'Unexpected suite nested within another suite.',
                    line: 1,
                    column: 55,
                    endLine: 1,
                    endColumn: 65
                }
            ]
        },
        {
            code: 'describe("", function () { foo(); });',
            errors: [ {
                message: 'Unexpected suite nested within another suite.',
                line: 1,
                column: 28,
                endLine: 1,
                endColumn: 33
            } ],
            name: 'reports custom suites nested inside suites',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        }
    ]
});
