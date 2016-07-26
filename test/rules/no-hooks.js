'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

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
        'var before = 2; before + 3;'
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
        }
    ]

});
