/**
 * @fileoverview Tests for prefer-arrow-callback rule.
 * @author Toru Nagashima (core eslint rule tests)
 * @author Michael Fields (mocha-aware additional tests)
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import { RuleTester } from 'eslint';
import { preferArrowCallbackRule } from './prefer-arrow-callback.js';

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2017, sourceType: 'script' }
});

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const errors: [RuleTester.TestCaseError] = [{
    message: 'Unexpected function expression.',
    type: 'FunctionExpression'
}];

ruleTester.run('prefer-arrow-callback', preferArrowCallbackRule, {
    valid: [
        // Smoke tests for the core ESLint rule integration.
        'foo(a => a);',
        'foo(function*() {});',
        { code: 'foo(function bar() {});', options: [{ allowNamedFunctions: true }] },
        {
            code: 'import.meta.url',
            languageOptions: {
                ecmaVersion: 2020,
                sourceType: 'module'
            }
        },
        // mocha-specific valid test cases
        'before(function bar() {});',
        'after(function bar() {});',
        'beforeEach(function bar() {});',
        'afterEach(function bar() {});',
        'describe("name", function bar() {});',
        'xdescribe("name", function bar() {});',
        'describe.only("name", function bar() {});',
        'describe.skip("name", function bar() {});',
        'context("name", function bar() {});',
        'xcontext("name", function bar() {});',
        'context.only("name", function bar() {});',
        'context.skip("name", function bar() {});',
        'suite("name", function bar() {});',
        'suite.only("name", function bar() {});',
        'suite.skip("name", function bar() {});',
        'it("name", function bar() {});',
        'it.only("name", function bar() {});',
        'it.skip("name", function bar() {});',
        'xit("name", function bar() {});',
        'test("name", function bar() {});',
        'test.only("name", function bar() {});',
        'test.skip("name", function bar() {});',
        'specify("name", function bar() {});',
        'specify.only("name", function bar() {});',
        'specify.skip("name", function bar() {});',
        'xspecify("name", function bar() {});'
    ],
    invalid: [
        // Smoke tests for the core ESLint rule integration.
        {
            code: 'foo(function() {});',
            output: 'foo(() => {});',
            errors
        },
        {
            code: 'foo(bar || function() { this; }.bind(this));',
            output: 'foo(bar || (() => { this; }));',
            errors
        },
        {
            code: 'foo(function() { this; });',
            // No fix applied
            output: null,
            options: [{ allowUnboundThis: false }],
            errors
        },
        {
            code: 'qux(async function (foo = 1, bar = 2, baz = 3) { return baz; })',
            output: 'qux(async (foo = 1, bar = 2, baz = 3) => { return baz; })',
            languageOptions: { ecmaVersion: 8 },
            errors
        },
        // Mocha-specific behavior.
        {
            code: 'it("name", function() { foo(function() {}); });',
            output: 'it("name", function() { foo(() => {}); });',
            errors
        }
    ]
});
