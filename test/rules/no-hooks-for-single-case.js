'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('no-hooks-for-single-case', rules['no-hooks-for-single-case'], {

    valid: [
        [
            'describe(function() {',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    after(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    beforeEach(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    afterEach(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'before(function() {});',
            'it(function() {});',
            'it(function() {});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    describe(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    xdescribe(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    describe(function() {});',
            '    describe(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it.only(function() {});',
            '    it(function() {});',
            '});'
        ].join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    describe(function() {',
            '        before(function() {});',
            '        it(function() {});',
            '        it(function() {});',
            '    });',
            '});'
        ].join('\n')
    ],

    invalid: [
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    it(function() {});',
                '    before(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 3 } ]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    beforeEach(function() {});',
                '    it(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    afterEach(function() {});',
                '    it(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'before(function() {});',
                'it(function() {});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 1, line: 1 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    xdescribe(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it.only(function() {});',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '        it(function() {});',
                '    });',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 9, line: 5 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '        it(function() {});',
                '        it(function() {});',
                '    });',
                '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 2 } ]
        }
    ]

});
