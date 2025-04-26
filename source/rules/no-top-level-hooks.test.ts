import { RuleTester } from 'eslint';
import { noTopLevelHooksRule } from './no-top-level-hooks.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-top-level-hooks', noTopLevelHooksRule, {
    valid: [
        'describe(function() { before(function() {}); });',
        'describe(function() { after(function() {}); });',
        'describe(function() { beforeEach(function() {}); });',
        'describe(function() { afterEach(function() {}); });',
        'describe(function() { it(function() {}); });',
        'describe(function() { describe(function() { before(function() {}); }); });',
        'foo.before()',
        'foo.after()',
        'foo.beforeEach()',
        'foo.afterEach()',
        'before.foo()',
        'after.foo()',
        'beforeEach.foo()',
        'afterEach.foo()',
        'var before = 2; before + 3;',
        {
            code: 'foo(function() { before(function() {}); });',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            }
        },
        {
            code: 'foo(function() { before(function() {}); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'describe.foo(function() { before(function() {}); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'describe.foo()(function() { before(function() {}); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo()', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'forEach().describe(function() { before(function() {}); });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'forEach().describe', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: 'describe(function() { before(function() {}); });',
            languageOptions: {
                ecmaVersion: 2019,
                sourceType: 'module'
            }
        }
    ],
    invalid: [
        {
            code: 'before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1
            }]
        },
        {
            code: 'after(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `after()` hook outside of a test suite',
                column: 1,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `beforeEach()` hook outside of a test suite',
                column: 1,
                line: 1
            }]
        },
        {
            code: 'afterEach(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `afterEach()` hook outside of a test suite',
                column: 1,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 26,
                line: 1
            }]
        },
        {
            code: 'before(function() {}); describe(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1
            }]
        },
        {
            code: 'foo(function() {}); before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 21,
                line: 1
            }]
        },
        {
            code: 'describe()(function() {}); before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 28,
                line: 1
            }]
        },
        {
            code: 'describe.foo()(function() {}); before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 32,
                line: 1
            }]
        },
        {
            code: 'before(function() {});',
            errors: [{
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1
            }],
            languageOptions: {
                ecmaVersion: 2019,
                sourceType: 'module'
            }
        }
    ]
});
