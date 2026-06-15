import { RuleTester } from 'eslint';
import { noRootHooksRule } from './no-root-hooks.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-root-hooks', noRootHooksRule, {
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
            name: 'allows hooks inside custom suites from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: 'foo(function() { before(function() {}); });',
            name: 'allows hooks inside custom suites from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe.foo(function() { before(function() {}); });',
            name: 'allows hooks inside custom member-expression suites',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe.foo()(function() { before(function() {}); });',
            name: 'allows hooks inside custom chained suites',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo()', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'forEach().describe(function() { before(function() {}); });',
            name: 'allows hooks inside custom nested chained suites',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'forEach().describe', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe(function() { prepareTestContexts(function() {}); });',
            name: 'allows custom hooks inside suites',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'prepareTestContexts', type: 'hook', interface: 'BDD' } ]
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
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'after(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `after()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 21
            } ]
        },
        {
            code: 'beforeEach(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `beforeEach()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 26
            } ]
        },
        {
            code: 'afterEach(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `afterEach()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 25
            } ]
        },
        {
            code: 'describe(function() {}); before(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 26,
                line: 1,
                endLine: 1,
                endColumn: 47
            } ]
        },
        {
            code: 'before(function() {}); describe(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        },
        {
            code: 'foo(function() {}); before(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 21,
                line: 1,
                endLine: 1,
                endColumn: 42
            } ]
        },
        {
            code: 'describe()(function() {}); before(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 28,
                line: 1,
                endLine: 1,
                endColumn: 49
            } ]
        },
        {
            code: 'describe.foo()(function() {}); before(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 32,
                line: 1,
                endLine: 1,
                endColumn: 53
            } ]
        },
        {
            code: 'prepareTestContexts(function() {});',
            errors: [ {
                message: 'Unexpected use of Mocha `prepareTestContexts()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 35
            } ],
            name: 'reports custom root hooks',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'prepareTestContexts', type: 'hook', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'before(function() {});',
            languageOptions: {
                ecmaVersion: 2019,
                sourceType: 'module'
            },
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook outside of a test suite',
                column: 1,
                line: 1,
                endLine: 1,
                endColumn: 22
            } ]
        }
    ]
});
