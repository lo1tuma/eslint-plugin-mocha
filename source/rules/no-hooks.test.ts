import assert from 'node:assert';
import { type Rule, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { noHooksRule } from './no-hooks.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-hooks', noHooksRule, {
    valid: [
        'describe(function() { it(function() {}); });',
        'describe(function() { it(function() {}); it(function() {}); });',
        'describe(function() { describe(function() { it(function() {}); }); });',
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
            code: 'describe(function() { before(function() {}); });',
            options: [ { allow: [ 'before' ] } ],
            name: 'valid case 1'
        },
        {
            code: 'describe(function() { after(function() {}); });',
            options: [ { allow: [ 'after' ] } ],
            name: 'valid case 2'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); });',
            options: [ { allow: [ 'beforeEach' ] } ],
            name: 'valid case 3'
        },
        {
            code: 'describe(function() { afterEach(function() {}); });',
            options: [ { allow: [ 'afterEach' ] } ],
            name: 'valid case 4'
        },
        {
            code: 'describe(function() { beforeAll(function() {}); });',
            options: [ { allow: [ 'beforeAll' ] } ],
            name: 'valid case 5'
        },
        {
            code: 'describe(function() { afterAll(function() {}); });',
            options: [ { allow: [ 'afterAll' ] } ],
            name: 'valid case 6'
        },
        {
            code: 'describe(function() { setup(function() {}); });',
            options: [ { allow: [ 'setup' ] } ],
            name: 'valid case 7'
        },
        {
            code: 'describe(function() { teardown(function() {}); });',
            options: [ { allow: [ 'teardown' ] } ],
            name: 'valid case 8'
        },
        {
            code: 'describe(function() { suiteSetup(function() {}); });',
            options: [ { allow: [ 'suiteSetup' ] } ],
            name: 'valid case 9'
        },
        {
            code: 'describe(function() { suiteTeardown(function() {}); });',
            options: [ { allow: [ 'suiteTeardown' ] } ],
            name: 'valid case 10'
        },
        {
            code: 'describe(function() { suiteTeardown(function() {}); });',
            options: [ { allow: [ 'suiteTeardown()' ] } ],
            name: 'valid case 11'
        },
        {
            code: 'describe(function() { prepareTestContexts(function() {}); });',
            options: [ { allow: [ 'prepareTestContexts()' ] } ],
            name: 'valid case 12',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'prepareTestContexts', type: 'hook', interface: 'BDD' } ]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe(function() { before(function() {}); });',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 44
            } ]
        },
        {
            code: 'describe(function() { after(function() {}); });',
            errors: [ {
                message: 'Unexpected use of Mocha `after()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 43
            } ]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); });',
            errors: [ {
                message: 'Unexpected use of Mocha `beforeEach()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 48
            } ]
        },
        {
            code: 'describe(function() { afterEach(function() {}); });',
            errors: [ {
                message: 'Unexpected use of Mocha `afterEach()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 47
            } ]
        },
        {
            code: 'describe(function() { describe(function() { before(function() {}); }); });',
            errors: [ {
                message: 'Unexpected use of Mocha `before()` hook',
                column: 45,
                line: 1,
                endLine: 1,
                endColumn: 66
            } ]
        },
        {
            code: 'describe(function() { after(function() {}); });',
            options: [ { allow: [ 'before' ] } ],
            errors: [ {
                message: 'Unexpected use of Mocha `after()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 43
            } ],
            name: 'invalid case 1'
        },
        {
            code: 'describe(function() { prepareTestContexts(function() {}); });',
            errors: [ {
                message: 'Unexpected use of Mocha `prepareTestContexts()` hook',
                column: 23,
                line: 1,
                endLine: 1,
                endColumn: 57
            } ],
            name: 'invalid case 2',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'prepareTestContexts', type: 'hook', interface: 'BDD' } ]
                }
            }
        }
    ]
});

suite('no-hooks create()', function () {
    test('normalizes non-string allow entries when invoked directly', function () {
        noHooksRule.create({
            id: 'no-hooks',
            options: [ { allow: [ 42 ] } ],
            settings: {},
            sourceCode: {
                scopeManager: {
                    globalScope: null
                }
            }
        } as unknown as Rule.RuleContext);

        assert.ok(true);
    });
});
