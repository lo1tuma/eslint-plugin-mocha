'use strict';

var rule = require('../../lib/rules/no-before-after'),
    RuleTester = require('eslint').RuleTester,
    ruleTester = new RuleTester(),

    beforeErrors = [ {
      // eslint-disable-next-line max-len
      message: 'Use `beforeEach` instead of `before` because `before` will run only once for all tests and we want setup and teardowns to happen once for each test',
      type: 'CallExpression'
    } ],

    afterErrors = [ {
      // eslint-disable-next-line max-len
      message: 'Use `afterEach` instead of `after` because `after` will run only once for all tests and we want setup and teardowns to happen once for each test',
      type: 'CallExpression'
    } ];

ruleTester.run('no-before-after', rule, {

  valid: [
    { code: 'before(function() {})' },
    { code: 'after(function() {})' },
    { code: 'beforeEach(function() {})' },
    { code: 'afterEach(function() {})' },
    { code: 'foo.before(function() {})' },
    { code: 'foo.after(function() {})' }
  ],

  invalid: [
    {
      code: 'describe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: [
        'describe(function() {',
        '  foo.bar(function() {',
        '    before(function() {});',
        '  });',
        '})'
      ].join('\n'),
      errors: beforeErrors
    },
    {
      code: 'context(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'xdescribe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'xcontext(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'describe.skip(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'context.skip(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'xdescribe.skip(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'xcontext.skip(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().describe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().context(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().xdescribe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().xcontext(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().skip().describe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().skip().context(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().skip().xdescribe(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'wrap().withFoo().skip().xcontext(function() { before(function() {}) })',
      errors: beforeErrors
    },
    {
      code: 'describe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'context(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'xdescribe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'xcontext(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'describe.skip(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'context.skip(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'xdescribe.skip(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'xcontext.skip(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().describe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().context(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().xdescribe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().xcontext(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().skip().describe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().skip().context(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().skip().xdescribe(function() { after(function() {}) })',
      errors: afterErrors
    },
    {
      code: 'wrap().withFoo().skip().xcontext(function() { after(function() {}) })',
      errors: afterErrors
    }
  ]
});
