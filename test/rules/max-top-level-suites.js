'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('max-top-level-suites', rules['max-top-level-suites'], {
    valid: [
        {
            code: 'describe("This is a test", function () { });'
        },
        {
            code: 'context("This is a test", function () { });'
        },
        {
            code: 'suite("This is a test", function () { });'
        },
        {
            code: 'describe("This is a test", function () { describe("This is a different test", function () { }) });'
        },
        {
            code: 'context("This is a test", function () { context("This is a different test", function () { }) });'
        },
        {
            code: 'suite("This is a test", function () { suite("This is a different test", function () { }) });'
        },
        {
            options: [ { limit: 2 } ],
            code: 'describe("This is a test", function () { });'
        },
        {
            options: [ { limit: 1 } ],
            code: 'someOtherFunction();'
        },
        {
            options: [ { limit: 0 } ],
            code: 'someOtherFunction();'
        },
        {
            options: [ { } ],
            code: 'someOtherFunction();'
        },
        'someOtherFunction();'
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });' +
                  'describe("this is an another different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'context("this is a test", function () { });' +
                  'context("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { });' +
                  'suite("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                  'someOtherFunction();' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'someOtherFunction();' +
                  'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            options: [ { limit: 2 } ],
            code: 'describe.skip("this is a test", function () { });' +
                  'describe.only("this is a different test", function () { });' +
                  'describe("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [ { limit: 1 } ],
            code: 'xdescribe("this is a test", function () { });' +
                  'describe.only("this is a different test", function () { });' +
                  'describe("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            options: [ { limit: 2 } ],
            code: 'suite.skip("this is a test", function () { });' +
                  'suite.only("this is a different test", function () { });' +
                  'suite("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [ { limit: 2 } ],
            code: 'context.skip("this is a test", function () { });' +
                  'context.only("this is a different test", function () { });' +
                  'context("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [ { limit: 0 } ],
            code: 'describe("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 0.' }
            ]
        },
        {
            options: [ { } ],
            code: 'describe("this is a test", function () { });' +
                  'describe.only("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        }
    ]
});
