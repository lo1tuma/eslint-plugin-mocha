'use strict';

const RuleTester = require('eslint').RuleTester;
const rules = require('../../').rules;
const ruleTester = new RuleTester();

ruleTester.run('no-exports', rules['no-exports'], {

    valid: [
        'describe(function() {});',
        'context(function() {});',
        'suite(function() {});',
        'before(function() {});',
        'beforeEach(function() {});',
        'after(function() {});',
        'afterEach(function() {});',
        'it("", function() {});',
        'test("", function() {});',
        'specify("", function() {});',
        'it("", function() {}); notModule.exports = "foo"',
        'notIt("", function() {}); module.exports = "foo"',
        'it("", function() {}); exports = "foo"',
        {
            code: 'describe(function () {})',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' }
        },
        {
            code: 'it("", function () {})',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' }
        },
        {
            code: 'beforeEach(function () {})',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' }
        }
    ],

    invalid: [
        {
            code: 'describe(function() {}); module.exports = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); module["exports"] = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); exports.foo = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); module.exports = "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); export default "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); export const bar = "foo";',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); let foo; export { foo }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 35,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); let foo; export { foo as bar }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 35,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); export * from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'describe(function() {}); export { bar } from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); module.exports = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); module["exports"] = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); exports.foo = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); module.exports = "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); export default "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); export const bar = "foo";',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); let foo; export { foo }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 33,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); let foo; export { foo as bar }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 33,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); export * from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'it("", function() {}); export { bar } from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); module.exports = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); module["exports"] = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); exports.foo = "foo"',
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); module.exports = "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); export default "foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); export const bar = "foo";',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 37,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo as bar }',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 37,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); export * from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        },
        {
            code: 'beforeEach(function() {}); export { bar } from "./foo"',
            parserOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [ {
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            } ]
        }
    ]

});
