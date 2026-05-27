import { RuleTester } from 'eslint';
import { noExportsRule } from './no-exports.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected export from a test file';

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
                message: expectedErrorMessage,
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 26,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportKeyword',
                    output: 'describe(function() {}); const bar = "foo";'
                }]
            }]
        },
        {
            code: 'describe(function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 35,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'describe(function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'describe(function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 35,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'describe(function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'describe(function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 26,
                line: 1
            }]
        },
        {
            code: 'describe(function() {}); export default function foo() {}',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 26,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportKeyword',
                    output: 'describe(function() {}); function foo() {}'
                }]
            }]
        },
        {
            code: 'describe(function() {}); export default function() {}',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 26,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export default "foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 24,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 24,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportKeyword',
                    output: 'it("", function() {}); const bar = "foo";'
                }]
            }]
        },
        {
            code: 'it("", function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 33,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'it("", function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'it("", function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 33,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'it("", function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'it("", function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 24,
                line: 1
            }]
        },
        {
            code: 'it("", function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 24,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export default "foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 28,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export const bar = "foo";',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 28,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportKeyword',
                    output: 'beforeEach(function() {}); const bar = "foo";'
                }]
            }]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 37,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'beforeEach(function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'beforeEach(function() {}); let foo; export { foo as bar }',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 37,
                line: 1,
                suggestions: [{
                    messageId: 'removeExportStatement',
                    output: 'beforeEach(function() {}); let foo; '
                }]
            }]
        },
        {
            code: 'beforeEach(function() {}); export * from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 28,
                line: 1
            }]
        },
        {
            code: 'beforeEach(function() {}); export { bar } from "./foo"',
            languageOptions: { ecmaVersion: 2019, sourceType: 'module' },
            errors: [{
                message: expectedErrorMessage,
                column: 28,
                line: 1
            }]
        }
    ]
});
