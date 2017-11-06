
'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    ALWAYS_MESSAGE = 'Test functions must be padded by blank lines.',
    NEVER_MESSAGE = 'Test functions must not be padded by blank lines.';

ruleTester.run('padding-between-tests', rules['padding-between-test-functions'], {

    valid: [
        {
            code: [
                'describe(function(){',
                '',
                'it("", function () {})',
                '',
                '})'
            ].join('\n')
        },
        {
            code: [
                'describe(function(){',
                '',
                'it("", function () {})',
                '',
                '})'
            ].join('\n'),
            options: [ 'always' ]
        },
        {
            code: [
                'describe(function(){',
                '',
                'it.only("", function () {})',
                '',
                '})'
            ].join('\n'),
            options: [ 'always' ]
        },
        {
            code: [
                'describe(function(){',
                'it("", function () {})',
                '})'
            ].join('\n'),
            options: [ 'never' ]
        },
        {
            code: [
                'describe(function(){',
                'it.only("", function () {})',
                '})'
            ].join('\n'),
            options: [ 'never' ]
        },
        {
            code: [
                '[1,2,3].forEach(function () {',
                'it("foo", function () {});',
                '});'
            ].join('\n'),
            options: [ 'never' ]
        },
        {
            code: [
                '[1,2,3].forEach(function () {',
                '',
                'it("foo", function () {});',
                '',
                '});'
            ].join('\n'),
            options: [ 'always' ]
        },
        {
            code: [
                'describe("foo", {});',
                'somethingElse();'
            ].join('\n'),
            options: [ 'never' ]
        },
        {
            code: [
                'describe("foo", {});',
                '',
                'somethingElse();'
            ].join('\n'),
            options: [ 'always' ]
        }
    ],

    invalid: [
        {
            code: [
                'describe(function(){',
                '',
                'it("", function () {})',
                '',
                '})'
            ].join('\n'),
            options: [ 'never' ],
            errors: [ { message: NEVER_MESSAGE }, { message: NEVER_MESSAGE } ],
            output: [
                'describe(function(){',
                'it("", function () {})',
                '})'
            ].join('\n')
        },
        {
            code: [
                'describe(function(){',
                'it("", function () {})',
                '})'
            ].join('\n'),
            options: [ 'always' ],
            errors: [ { message: ALWAYS_MESSAGE }, { message: ALWAYS_MESSAGE } ],
            output: [
                'describe(function(){',
                '',
                'it("", function () {})',
                '',
                '})'
            ].join('\n')
        },
        {
            code: [
                '[1,2,3].forEach(function () {',
                '',
                'it("foo", function () {});',
                '',
                '});'
            ].join('\n'),
            options: [ 'never' ],
            errors: [ { message: NEVER_MESSAGE }, { message: NEVER_MESSAGE } ],
            output: [
                '[1,2,3].forEach(function () {',
                'it("foo", function () {});',
                '});'
            ].join('\n')
        },
        {
            code: [
                '[1,2,3].forEach(function () {',
                'it("foo", function () {});',
                '});'
            ].join('\n'),
            options: [ 'always' ],
            errors: [ { message: ALWAYS_MESSAGE }, { message: ALWAYS_MESSAGE } ],
            output: [
                '[1,2,3].forEach(function () {',
                '',
                'it("foo", function () {});',
                '',
                '});'
            ].join('\n')
        },
        {
            code: [
                'describe(function(){',
                'var someVar=null;',
                'beforeEach(function(){someVar = "test"});',
                'it("foo", function(){assert(someVar)});',
                '})'
            ].join('\n'),
            options: [ 'always' ],
            errors: [
                { message: ALWAYS_MESSAGE },
                { message: ALWAYS_MESSAGE },
                { message: ALWAYS_MESSAGE }
            ],
            output: [
                'describe(function(){',
                'var someVar=null;',
                '',
                'beforeEach(function(){someVar = "test"});',
                '',
                'it("foo", function(){assert(someVar)});',
                '',
                '})'
            ].join('\n')
        }
    ]

});
