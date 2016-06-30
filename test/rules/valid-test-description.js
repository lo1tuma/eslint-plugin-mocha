'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('valid-test-description', rules['valid-test-description'], {
    valid: [
        'it("should respond to GET", function() { });',
        'it("should do something");',
        'specify("should respond to GET", function() { });',
        'specify("should do something");',
        'test("should respond to GET", function() { });',
        'test("should do something");',
        'it();',
        'specify();',
        'test();',
        {
            options: [ 'test' ],
            code: 'it("this is a test", function () { });'
        },
        {
            options: [ 'test' ],
            code: 'test("this is a test", function () { });'
        },
        {
            options: [ '^should', [ 'someFunction' ] ],
            code: 'it("this is a test", function () { });'
        },
        {
            options: [ '^should', [ 'someFunction' ] ],
            code: 'someFunction("should do something", function () { });'
        },
        'someOtherFunction();'
    ],

    invalid: [
        {
            code: 'it("does something", function() { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            code: 'specify("does something", function() { });',
            errors: [
                { message: 'Invalid "specify()" description found.' }
            ]
        },
        {
            code: 'test("does something", function() { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        },
        {
            options: [ 'required' ],
            code: 'it("this is a test", function () { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            options: [ 'required' ],
            code: 'specify("this is a test", function () { });',
            errors: [
                { message: 'Invalid "specify()" description found.' }
            ]
        },
        {
            options: [ 'required' ],
            code: 'test("this is a test", function () { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        },
        {
            options: [ 'required', [ 'customFunction' ] ],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        }
    ]
});
