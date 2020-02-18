'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();

ruleTester.run('no-hooks', rules['no-hooks'], {

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
            options: [ { allow: [ 'before' ] } ]
        },
        {
            code: 'describe(function() { after(function() {}); });',
            options: [ { allow: [ 'after' ] } ]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); });',
            options: [ { allow: [ 'beforeEach' ] } ]
        },
        {
            code: 'describe(function() { afterEach(function() {}); });',
            options: [ { allow: [ 'afterEach' ] } ]
        },
        {
            code: 'describe(function() { beforeAll(function() {}); });',
            options: [ { allow: [ 'beforeAll' ] } ]
        },
        {
            code: 'describe(function() { afterAll(function() {}); });',
            options: [ { allow: [ 'afterAll' ] } ]
        },
        {
            code: 'describe(function() { setup(function() {}); });',
            options: [ { allow: [ 'setup' ] } ]
        },
        {
            code: 'describe(function() { teardown(function() {}); });',
            options: [ { allow: [ 'teardown' ] } ]
        },
        {
            code: 'describe(function() { suiteSetup(function() {}); });',
            options: [ { allow: [ 'suiteSetup' ] } ]
        },
        {
            code: 'describe(function() { suiteTeardown(function() {}); });',
            options: [ { allow: [ 'suiteTeardown' ] } ]
        }
    ],

    invalid: [
        {
            code: 'describe(function() { before(function() {}); });',
            errors: [ { message: 'Unexpected use of Mocha `before` hook', column: 23, line: 1 } ]
        },
        {
            code: 'describe(function() { after(function() {}); });',
            errors: [ { message: 'Unexpected use of Mocha `after` hook', column: 23, line: 1 } ]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); });',
            errors: [ { message: 'Unexpected use of Mocha `beforeEach` hook', column: 23, line: 1 } ]
        },
        {
            code: 'describe(function() { afterEach(function() {}); });',
            errors: [ { message: 'Unexpected use of Mocha `afterEach` hook', column: 23, line: 1 } ]
        },
        {
            code: 'describe(function() { describe(function() { before(function() {}); }); });',
            errors: [ { message: 'Unexpected use of Mocha `before` hook', column: 45, line: 1 } ]
        },
        {
            code: 'describe(function() { after(function() {}); });',
            options: [ { allow: [ 'before' ] } ],
            errors: [ { message: 'Unexpected use of Mocha `after` hook', column: 23, line: 1 } ]
        }
    ]

});
