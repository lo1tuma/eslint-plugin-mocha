'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('valid-it-test-desc', rules['valid-it-test-desc'], {
    valid: [
        'it("should respond to GET", function() { });',
        'it("should do something");',
        'test("should respond to GET", function() { });',
        'test("should do something");',
        'it();',
        'test();',
        {
            options: [ 'test' ],
            code: 'it("this is a test", function () { });'
        },
        {
            options: [ 'test' ],
            code: 'test("this is a test", function () { });'
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
            code: 'test("this is a test", function () { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        }
    ]
});
