import { RuleTester } from 'eslint';
import { noExportsRule } from './no-exports.js';
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-exports', noExportsRule, {
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
        {
            code: 'describe(function () {})',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' }
        },
        {
            code: 'it("", function () {})',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' }
        },
        {
            code: 'beforeEach(function () {})',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' }
        }
    ],

    invalid: [
        {
            code: 'describe(function() {}); export default "foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 35,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 35,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 26,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export default "foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 33,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 33,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 24,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export default "foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 37,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 37,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: 'Unexpected export from a test file',
                column: 28,
                line: 1
            }]
        }
    ]
});
