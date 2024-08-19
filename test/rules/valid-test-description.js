const { RuleTester } = require('eslint');
const { rules } = require('../../');
const ruleTester = new RuleTester();

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
            options: ['test'],
            code: 'it("this is a test", function () { });'
        },
        {
            options: ['test'],
            code: 'test("this is a test", function () { });'
        },
        {
            options: ['^should', ['someFunction']],
            code: 'it("this is a test", function () { });'
        },
        {
            options: ['^should', ['someFunction']],
            code: 'someFunction("should do something", function () { });'
        },
        {
            options: ['^should', ['someFunction'], 'some error message'],
            code: 'someFunction("should do something", function () { });'
        },
        {
            options: [{ pattern: '^should', testNames: ['someFunction'], message: 'some error message' }],
            code: 'someFunction("should do something", function () { });'
        },
        'someOtherFunction();',
        {
            parserOptions: { ecmaVersion: 2017 },
            code: 'it(`should work with template strings`, function () {});'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(foo`work with template strings`, function () {});'
        },
        {
            parserOptions: { ecmaVersion: 2019 },
            code: 'it(`${foo} work with template strings`, function () {});'
        }
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
            options: ['required'],
            code: 'it("this is a test", function () { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            options: ['required'],
            code: 'specify("this is a test", function () { });',
            errors: [
                { message: 'Invalid "specify()" description found.' }
            ]
        },
        {
            options: ['required'],
            code: 'test("this is a test", function () { });',
            errors: [
                { message: 'Invalid "test()" description found.' }
            ]
        },
        {
            options: ['required', ['customFunction']],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'Invalid "customFunction()" description found.' }
            ]
        },
        {
            options: ['required', ['customFunction'], 'some error message'],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: [{ pattern: 'required', testNames: ['customFunction'], message: 'some error message' }],
            code: 'customFunction("this is a test", function () { });',
            errors: [
                { message: 'some error message' }
            ]
        },
        {
            options: [{}],
            code: 'it("this is a test", function () { });',
            errors: [
                { message: 'Invalid "it()" description found.' }
            ]
        },
        {
            code: 'it(`this is a test`, function () { });',
            parserOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 1 }
            ]
        },
        {
            code: 'const foo = "this"; it(`${foo} is a test`, function () { });',
            parserOptions: {
                ecmaVersion: 2019
            },
            errors: [
                { message: 'Invalid "it()" description found.', line: 1, column: 21 }
            ]
        }
    ]
});
