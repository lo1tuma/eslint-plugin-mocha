'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('no-identical-title', rules['no-identical-title'], {

    valid: [
        [
            'describe("describe", function() {',
            '   it("it", function() {});',
            '});'
        ].join('\n'),
        [
            'describe("describe1", function() {',
            '   it("it1", function() {});',
            '   it("it2", function() {});',
            '});'
        ].join('\n'),
        [
            'it("it1", function() {});',
            'it("it2", function() {});'
        ].join('\n'),
        [
            'it.only("it1", function() {});',
            'it("it2", function() {});'
        ].join('\n'),
        [
            'it.only("it1", function() {});',
            'it.only("it2", function() {});'
        ].join('\n'),
        [
            'describe("title", function() {});',
            'it("title", function() {});'
        ].join('\n'),
        [
            'describe("describe1", function() {',
            '   it("it1", function() {});',
            '   describe("describe2", function() {',
            '       it("it1", function() {});',
            '   });',
            '});'
        ].join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {',
            '       it("it1", function() {});',
            '   });',
            '   it("it1", function() {});',
            '});'
        ].join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {});',
            '});'
        ].join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {});',
            '});',
            'describe("describe2", function() {});'
        ].join('\n'),
        [
            'describe("describe1", function() {});',
            'describe("describe2", function() {});'
        ].join('\n'),
        [
            'it("it" + n, function() {});',
            'it("it" + n, function() {});'
        ].join('\n'),
        {
            code: [
                'it(`it${n}`, function() {});',
                'it(`it${n}`, function() {});'
            ].join('\n'),
            env: {
                es6: true
            }
        }
    ],

    invalid: [
        {
            code: [
                'describe("describe1", function() {',
                '   it("it1", function() {});',
                '   it("it1", function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Test title is used multiple times in the same test suite.', column: 4, line: 3 } ]
        },
        {
            code: [
                'it("it1", function() {});',
                'it("it1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 } ]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it("it1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 } ]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it.only("it1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 } ]
        },
        {
            code: [
                'it("it1", function() {});',
                'specify("it1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 } ]
        },
        {
            code: [
                'describe("describe1", function() {});',
                'describe("describe1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test suite title is used multiple times.', column: 1, line: 2 } ]
        },
        {
            code: [
                'describe("describe1", function() {',
                '   describe("describe2", function() {});',
                '});',
                'describe("describe1", function() {});'
            ].join('\n'),
            errors: [ { message: 'Test suite title is used multiple times.', column: 1, line: 4 } ]
        }
    ]

});
