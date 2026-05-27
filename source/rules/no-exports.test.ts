import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import {
    createExportSuggestions,
    fixRemoveExportKeyword,
    fixRemoveExportStatement,
    isLocalNamedExportList,
    noExportsRule
} from './no-exports.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected export from a test file';

function asRuleFixer(ruleFixer: Record<string, unknown>): Rule.RuleFixer {
    return ruleFixer as unknown as Rule.RuleFixer;
}

function asFixKeywordNode(
    node: Record<string, unknown>
): Parameters<typeof fixRemoveExportKeyword>[1] {
    return node as unknown as Parameters<typeof fixRemoveExportKeyword>[1];
}

function asFixStatementNode(
    node: Record<string, unknown>
): Parameters<typeof fixRemoveExportStatement>[1] {
    return node as unknown as Parameters<typeof fixRemoveExportStatement>[1];
}

function asSuggestionNode(
    node: Record<string, unknown>
): Parameters<typeof createExportSuggestions>[0] {
    return node as unknown as Parameters<typeof createExportSuggestions>[0];
}

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

describe('no-exports helpers', function () {
    it('fixRemoveExportKeyword() returns null without a declaration', function () {
        const result = fixRemoveExportKeyword(
            asRuleFixer({
                removeRange() {
                    return null;
                }
            }),
            asFixKeywordNode({
                type: 'ExportDefaultDeclaration',
                range: [0, 7]
            })
        );

        assert.strictEqual(result, null);
    });

    it('fixRemoveExportKeyword() returns null without ranges', function () {
        const result = fixRemoveExportKeyword(
            asRuleFixer({
                removeRange() {
                    return null;
                }
            }),
            asFixKeywordNode({
                type: 'ExportNamedDeclaration',
                declaration: {
                    type: 'VariableDeclaration',
                    declarations: [],
                    kind: 'const'
                },
                specifiers: [],
                source: null
            })
        );

        assert.strictEqual(result, null);
    });

    it('fixRemoveExportKeyword() returns null when the declaration range is missing', function () {
        const result = fixRemoveExportKeyword(
            asRuleFixer({
                removeRange() {
                    return null;
                }
            }),
            asFixKeywordNode({
                type: 'ExportNamedDeclaration',
                range: [0, 7],
                declaration: {
                    type: 'VariableDeclaration',
                    declarations: [],
                    kind: 'const'
                },
                specifiers: [],
                source: null
            })
        );

        assert.strictEqual(result, null);
    });

    it('fixRemoveExportKeyword() returns null when the export range is missing', function () {
        const result = fixRemoveExportKeyword(
            asRuleFixer({
                removeRange() {
                    return null;
                }
            }),
            asFixKeywordNode({
                type: 'ExportNamedDeclaration',
                declaration: {
                    type: 'VariableDeclaration',
                    declarations: [],
                    kind: 'const',
                    range: [7, 20]
                },
                specifiers: [],
                source: null
            })
        );

        assert.strictEqual(result, null);
    });

    it('fixRemoveExportStatement() returns null without a range', function () {
        const result = fixRemoveExportStatement(
            asRuleFixer({
                removeRange() {
                    return null;
                }
            }),
            asFixStatementNode({
                type: 'ExportNamedDeclaration',
                declaration: null,
                specifiers: [],
                source: null
            })
        );

        assert.strictEqual(result, null);
    });

    it('createExportSuggestions() ignores default export expressions', function () {
        const result = createExportSuggestions(asSuggestionNode({
            type: 'ExportDefaultDeclaration',
            declaration: {
                type: 'Literal',
                value: 'foo'
            }
        }));

        assert.deepStrictEqual(result, []);
    });

    it('createExportSuggestions() ignores anonymous default export declarations', function () {
        const result = createExportSuggestions(asSuggestionNode({
            type: 'ExportDefaultDeclaration',
            declaration: {
                type: 'FunctionDeclaration',
                id: null
            }
        }));

        assert.deepStrictEqual(result, []);
    });

    it('createExportSuggestions() ignores re-export declarations', function () {
        const result = createExportSuggestions(asSuggestionNode({
            type: 'ExportNamedDeclaration',
            declaration: null,
            specifiers: [],
            source: {
                type: 'Literal',
                value: './foo'
            }
        }));

        assert.deepStrictEqual(result, []);
    });

    it('isLocalNamedExportList() rejects named exports with declarations', function () {
        const result = isLocalNamedExportList(asSuggestionNode({
            type: 'ExportNamedDeclaration',
            declaration: {
                type: 'VariableDeclaration',
                declarations: [],
                kind: 'const'
            },
            source: null
        }));

        assert.strictEqual(result, false);
    });
});
