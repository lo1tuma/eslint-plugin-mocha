'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('no-sibling-hooks', rules['no-sibling-hooks'], {

    valid: [
        'describe(function() { before(function() {}); it(function() {}); });',
        'describe(function() { after(function() {}); it(function() {}); });',
        'describe(function() { beforeEach(function() {}); it(function() {}); });',
        'describe(function() { afterEach(function() {}); it(function() {}); });',
        'describe(function() { before(function() {}); after(function() {}); });',
        'describe(function() { before(function() {}); beforeEach(function() {}); });',
        'describe(function() { beforeEach(function() {}); afterEach(function() {}); });',
        'before(function() {}); beforeEach(function() {});',
        'foo.before(function() {}); foo.before(function() {});',
        [
          'describe(function() {',
          '    before(function() {});',
          '    describe(function() {',
          '        before(function() {});',
          '    });',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    describe(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    describe.only(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    describe.skip(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    xdescribe(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    context(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n'),
        [
          'describe(function() {',
          '    xcontext(function() {',
          '        before(function() {});',
          '    });',
          '    before(function() {});',
          '});'
        ].join('\n')
    ],

    invalid: [
        {
            code: 'describe(function() { before(function() {}); before(function() {}); });',
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 46, line: 1 } ]
        },
        {
            code: 'describe(function() { after(function() {}); after(function() {}); });',
            errors: [ { message: 'Unexpected use of duplicate Mocha `after` hook', column: 45, line: 1 } ]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); beforeEach(function() {}); });',
            errors: [ { message: 'Unexpected use of duplicate Mocha `beforeEach` hook', column: 50, line: 1 } ]
        },
        {
            code: 'describe(function() { afterEach(function() {}); afterEach(function() {}); });',
            errors: [ { message: 'Unexpected use of duplicate Mocha `afterEach` hook', column: 49, line: 1 } ]
        },
        {
            code: [
              'describe(function() {',
              '    before(function() {});',
              '    describe(function() {',
              '        before(function() {});',
              '        before(function() {});',
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
              '    });',
              '    before(function() {});',
              '});'
            ].join('\n'),
            errors: [ { message: 'Unexpected use of duplicate Mocha `before` hook', column: 5, line: 6 } ]
        }
    ]

});
