'use strict';

var RuleTester = require('eslint').RuleTester,
    rules = require('../../').rules,
    ruleTester = new RuleTester();

ruleTester.run('one-suite-per-file', rules['one-suite-per-file'], {
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
            code: 'describe("this is a test", function () { });'
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
            options: [ [ 'someFunction' ] ],
            code: 'someFunction("Should do something", function () { });'
        },
        'someOtherFunction();'
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });' +
                  'describe("this is an another different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'context("this is a test", function () { });' +
                  'context("this is a different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { });' +
                  'suite("this is a different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                  'someOtherFunction();' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            code: 'someOtherFunction();' +
                  'describe("this is a test", function () { });' +
                  'describe("this is a different test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        },
        {
            options: [ [ 'customFunction' ] ],
            code: 'customFunction("this is a test", function () { });' +
                  'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Multiple top-level suites are not allowed.' }
            ]
        }
    ]
});
