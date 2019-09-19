/**
 * @fileoverview Tests for prefer-arrow-callback rule.
 * @author Toru Nagashima (core eslint rule tests)
 * @author Michael Fields (mocha-aware additional tests)
 */

'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester({
    parserOptions: { ecmaVersion: 2017 }
});

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const errors = [ {
    message: 'Unexpected function expression.',
    type: 'FunctionExpression'
} ];

ruleTester.run('prefer-arrow-callback', rules['prefer-arrow-callback'], {
    valid: [
        'foo(a => a);',
        'foo(function*() {});',
        'foo(function() { this; });',
        { code: 'foo(function bar() {});', options: [ { allowNamedFunctions: true } ] },
        'foo(function() { (() => this); });',
        'foo(function() { this; }.bind(obj));',
        'foo(function() { this; }.call(this));',
        'foo(a => { (function() {}); });',
        'var foo = function foo() {};',
        '(function foo() {})();',
        'foo(function bar() { bar; });',
        'foo(function bar() { arguments; });',
        'foo(function bar() { arguments; }.bind(this));',
        'foo(function bar() { new.target; });',
        'foo(function bar() { new.target; }.bind(this));',
        'foo(function bar() { this; }.bind(this, somethingElse));',
        // mocha-specific valid test cases
        'before(function bar() {});',
        'after(function bar() {});',
        'beforeEach(function bar() {});',
        'afterEach(function bar() {});',
        'describe("name", function bar() {});',
        'xdescribe("name", function bar() {});',
        'describe.only("name", function bar() {});',
        'describe.skip("name", function bar() {});',
        'context("name", function bar() {});',
        'xcontext("name", function bar() {});',
        'context.only("name", function bar() {});',
        'context.skip("name", function bar() {});',
        'suite("name", function bar() {});',
        'xsuite("name", function bar() {});',
        'suite.only("name", function bar() {});',
        'suite.skip("name", function bar() {});',
        'it("name", function bar() {});',
        'it.only("name", function bar() {});',
        'it.skip("name", function bar() {});',
        'xit("name", function bar() {});',
        'specify("name", function bar() {});',
        'specify.only("name", function bar() {});',
        'specify.skip("name", function bar() {});',
        'xspecify("name", function bar() {});'
    ],
    invalid: [
        {
            code: 'foo(function bar() {});',
            output: 'foo(() => {});',
            errors
        },
        {
            code: 'foo(function() {});',
            output: 'foo(() => {});',
            options: [ { allowNamedFunctions: true } ],
            errors
        },
        {
            code: 'foo(function bar() {});',
            output: 'foo(() => {});',
            options: [ { allowNamedFunctions: false } ],
            errors
        },
        {
            code: 'foo(function() {});',
            output: 'foo(() => {});',
            errors
        },
        {
            code: 'foo(nativeCb || function() {});',
            output: 'foo(nativeCb || (() => {}));',
            errors
        },
        {
            code: 'foo(bar ? function() {} : function() {});',
            output: 'foo(bar ? () => {} : () => {});',
            errors: [ errors[0], errors[0] ]
        },
        {
            code: 'foo(function() { (function() { this; }); });',
            output: 'foo(() => { (function() { this; }); });',
            errors
        },
        {
            code: 'foo(function() { this; }.bind(this));',
            output: 'foo(() => { this; });',
            errors
        },
        {
            code: 'foo(bar || function() { this; }.bind(this));',
            output: 'foo(bar || (() => { this; }));',
            errors
        },
        {
            code: 'foo(function() { (() => this); }.bind(this));',
            output: 'foo(() => { (() => this); });',
            errors
        },
        {
            code: 'foo(function bar(a) { a; });',
            output: 'foo((a) => { a; });',
            errors
        },
        {
            code: 'foo(function(a) { a; });',
            output: 'foo((a) => { a; });',
            errors
        },
        {
            code: 'foo(function(arguments) { arguments; });',
            output: 'foo((arguments) => { arguments; });',
            errors
        },
        {
            code: 'foo(function() { this; });',
            // No fix applied
            output: null,
            options: [ { allowUnboundThis: false } ],
            errors
        },
        {
            code: 'foo(function() { (() => this); });',
            // No fix applied
            output: null,
            options: [ { allowUnboundThis: false } ],
            errors
        },
        {
            code: 'qux(function(foo, bar, baz) { return foo * 2; })',
            output: 'qux((foo, bar, baz) => { return foo * 2; })',
            errors
        },
        {
            code: 'qux(function(foo, bar, baz) { return foo * bar; }.bind(this))',
            output: 'qux((foo, bar, baz) => { return foo * bar; })',
            errors
        },
        {
            code: 'qux(function(foo, bar, baz) { return foo * this.qux; }.bind(this))',
            output: 'qux((foo, bar, baz) => { return foo * this.qux; })',
            errors
        },
        {
            code: 'foo(function() {}.bind(this, somethingElse))',
            output: 'foo((() => {}).bind(this, somethingElse))',
            errors
        },
        {
            code: 'qux(function(foo = 1, [bar = 2] = [], {qux: baz = 3} = {foo: \'bar\'}) { return foo + bar; });',
            output: 'qux((foo = 1, [bar = 2] = [], {qux: baz = 3} = {foo: \'bar\'}) => { return foo + bar; });',
            errors
        },
        {
            code: 'qux(function(baz, baz) { })',
            // Duplicate parameter names are a SyntaxError in arrow functions
            output: null,
            errors
        },
        {
            code: 'qux(function( /* no params */ ) { })',
            output: 'qux(( /* no params */ ) => { })',
            errors
        },
        {
            code: 'qux(function( /* a */ foo /* b */ , /* c */ bar /* d */ , /* e */ baz /* f */ ) { return foo; })',
            output: 'qux(( /* a */ foo /* b */ , /* c */ bar /* d */ , /* e */ baz /* f */ ) => { return foo; })',
            errors
        },
        {
            code: 'qux(async function (foo = 1, bar = 2, baz = 3) { return baz; })',
            output: 'qux(async (foo = 1, bar = 2, baz = 3) => { return baz; })',
            parserOptions: { ecmaVersion: 8 },
            errors
        },
        {
            code: 'qux(async function (foo = 1, bar = 2, baz = 3) { return this; }.bind(this))',
            output: 'qux(async (foo = 1, bar = 2, baz = 3) => { return this; })',
            parserOptions: { ecmaVersion: 8 },
            errors
        }
    ]
});
