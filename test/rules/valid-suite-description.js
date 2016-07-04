'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('valid-suite-description', rules['valid-suite-description'], {
    valid: [
        {
            options: [ '^[A-Z]' ],
            code: 'describe("This is a test", function () { });'
        },
        {
            options: [ '^[A-Z]' ],
            code: 'context("This is a test", function () { });'
        },
        {
            options: [ '^[A-Z]' ],
            code: 'suite("This is a test", function () { });'
        },
        {
            options: [ '^[A-Z]', [ 'someFunction' ] ],
            code: 'describe("this is a test", function () { });'
        },
        {
            options: [ '^[A-Z]', [ 'someFunction' ] ],
            code: 'someFunction("Should do something", function () { });'
        },
        'someOtherFunction();'
    ],

    invalid: [
        {
            options: [ '^[A-Z]' ],
            code: 'describe("this is a test", function () { });',
            errors: [
                { message: 'Invalid "describe()" description found.' }
            ]
        },
        {
            options: [ '^[A-Z]' ],
            code: 'context("this is a test", function () { });',
            errors: [
                { message: 'Invalid "context()" description found.' }
            ]
        },
        {
            options: [ '^[A-Z]' ],
            code: 'suite("this is a test", function () { });',
            errors: [
                { message: 'Invalid "suite()" description found.' }
            ]
        },
        {
            options: [ '^[A-Z]', [ 'customFunction' ] ],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        }
    ]
});
