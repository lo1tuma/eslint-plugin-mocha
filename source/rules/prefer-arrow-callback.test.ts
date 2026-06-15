/**
 * @fileoverview Tests for prefer-arrow-callback rule.
 * @author Toru Nagashima (core eslint rule tests)
 * @author Michael Fields (mocha-aware additional tests)
 */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import assert from 'node:assert';
import { type Rule, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { asRuleNode } from '../ast/rule-node.js';
import { withInterface } from '../mocha-interface-test-cases.js';
import { preferArrowCallbackRule } from './prefer-arrow-callback.js';
import { isMochaCallbackReport } from './prefer-arrow-callback-report.js';

const ruleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2017, sourceType: 'script' }
});

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const errors: [RuleTester.TestCaseError] = [ {
    message: 'Unexpected function expression.'
} ];

ruleTester.run('prefer-arrow-callback', preferArrowCallbackRule, {
    valid: [
        // Smoke tests for the core ESLint rule integration.
        'foo(a => a);',
        'foo(function*() {});',
        {
            code: 'foo(function bar() {});',
            options: [ { allowNamedFunctions: true } ],
            name: 'allows named functions when configured'
        },
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
        withInterface('TDD', 'suite("name", function bar() {});'),
        withInterface('TDD', 'suite.only("name", function bar() {});'),
        withInterface('TDD', 'suite.skip("name", function bar() {});'),
        'it("name", function bar() {});',
        'it.only("name", function bar() {});',
        'it.skip("name", function bar() {});',
        'xit("name", function bar() {});',
        withInterface('TDD', 'test("name", function bar() {});'),
        withInterface('TDD', 'test.only("name", function bar() {});'),
        withInterface('TDD', 'test.skip("name", function bar() {});'),
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
            output: null,
            // No fix applied
            options: [ { allowUnboundThis: false } ],
            errors,
            name: 'does not fix unbound this when disallowed'
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

suite('prefer-arrow-callback report filtering', function () {
    test('isMochaCallbackReport() ignores non-record reports', function () {
        const mochaCallbacks = new WeakSet<Rule.Node>();

        assert.strictEqual(isMochaCallbackReport(mochaCallbacks, null), false);
    });

    test('isMochaCallbackReport() ignores reports without rule nodes', function () {
        const mochaCallbacks = new WeakSet<Rule.Node>();

        assert.strictEqual(
            isMochaCallbackReport(mochaCallbacks, { message: 'Unexpected function expression.' }),
            false
        );
    });

    test('isMochaCallbackReport() recognizes registered callback nodes', function () {
        const node = asRuleNode({ type: 'FunctionExpression' });
        const mochaCallbacks = new WeakSet<Rule.Node>([ node ]);

        assert.strictEqual(
            isMochaCallbackReport(mochaCallbacks, { message: 'Unexpected function expression.', node }),
            true
        );
    });
});
