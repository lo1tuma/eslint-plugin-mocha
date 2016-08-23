'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester(),
    message = 'Unexpected use of `return` in a test with callback',
    es6parserOptions = {
        sourceType: 'module',
        ecmaVersion: 6
    };

ruleTester.run('no-return-and-callback', rules['no-return-and-callback'], {

    valid: [
        'it("title", function(done) { done(); });',
        'it("title", function(done) { foo.then(function() { return done(); }); });',
        'it("title", function(done) { foo(function() { return done(); }); });',
        'it("title", function() { return foo(); });',
        'it.only("title", function(done) { done(); });',
        'it.only("title", function(done) { foo.then(function() { return done(); }); });',
        'it.only("title", function(done) { foo(function() { return done(); }); });',
        'it.only("title", function() { return foo(); });',
        'before("title", function(done) { done(); });',
        'before("title", function(done) { foo.then(function() { return done(); }); });',
        'before("title", function(done) { foo(function() { return done(); }); });',
        'before("title", function() { return foo(); });',
        'after("title", function(done) { done(); });',
        'after("title", function(done) { foo.then(function() { return done(); }); });',
        'after("title", function(done) { foo(function() { return done(); }); });',
        'after("title", function() { return foo(); });',
        'function foo(done) { return foo.then(done); }',
        'var foo = function(done) { return foo.then(done); }',
        'notMocha("title", function(done) { return foo.then(done); })',
        {
            code: 'it("title", (done) => { done(); });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", (done) => { foo.then(function() { return done(); }); });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", (done) => { foo(function() { return done(); }); });',
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", () => { return foo(); });',
            parserOptions: es6parserOptions
        },
        // Allowed return statements
        'it("title", function(done) { return; });',
        'it("title", function(done) { return undefined; });',
        'it("title", function(done) { return null; });',
        'it("title", function(done) { return "3"; });',
        'it("title", function(done) { return done(); });',
        'it("title", function(done) { return done(error); });'
    ],

    invalid: [
        {
            code: 'it("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 30, line: 1 } ]
        },
        {
            code: 'it("title", function(done) { return foo.then(function() { done(); }).catch(done); });',
            errors: [ { message: message, column: 30, line: 1 } ]
        },
        {
            code: 'it("title", function(done) { var foo = bar(); return foo.then(function() { done(); }); });',
            errors: [ { message: message, column: 47, line: 1 } ]
        },
        {
            code: 'it("title", (done) => { return foo.then(function() { done(); }).catch(done); });',
            errors: [ { message: message, column: 25, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it("title", (done) => foo.then(function() { done(); }));',
            errors: [ { message: 'Confusing implicit return in a test with callback', column: 23, line: 1 } ],
            parserOptions: es6parserOptions
        },
        {
            code: 'it.only("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 35, line: 1 } ]
        },
        {
            code: 'before("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 34, line: 1 } ]
        },
        {
            code: 'beforeEach("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 38, line: 1 } ]
        },
        {
            code: 'after("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 33, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(done) { return foo.then(done); });',
            errors: [ { message: message, column: 37, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(done) { return foo; });',
            errors: [ { message: message, column: 37, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(done) { return done; });',
            errors: [ { message: message, column: 37, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(done) { return done.foo(); });',
            errors: [ { message: message, column: 37, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(done) { return foo.done(); });',
            errors: [ { message: message, column: 37, line: 1 } ]
        },
        {
            code: 'afterEach("title", function(end) { return done(); });',
            errors: [ { message: message, column: 36, line: 1 } ]
        }
    ]

});
