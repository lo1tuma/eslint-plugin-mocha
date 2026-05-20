import { type Rule, RuleTester, type Scope, type SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    consistentInterfaceRule,
    createUnexpectedImportDescriptor,
    fixImportSpecifier,
    getImportedName,
    getImportSpecifierRemovalRange,
    getMochaImportBinding,
    getMochaModuleScope,
    removeFullImportDeclaration,
    reportUnexpectedImportBinding,
    reportUnexpectedImportBindingsInModule
} from './consistent-interface.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } });

function asRuleContext(ruleContext: Record<string, unknown>): Rule.RuleContext {
    return ruleContext as unknown as Rule.RuleContext;
}

function asScopeVariable(variable: Record<string, unknown>): Scope.Variable {
    return variable as unknown as Scope.Variable;
}

ruleTester.run('consistent-interface', consistentInterfaceRule, {
    valid: [
        {
            code: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'exports' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } }
        },
        {
            code: `import {describe as foo, it as bar} from 'mocha'; foo('foo', () => {
                bar('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } }
        },
        {
            code: 'import {run} from "mocha"; run();',
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } }
        }
    ],

    invalid: [
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [{ line: 2, column: 17, message: 'Unexpected use of TDD interface instead of BDD' }]
        },
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'TDD' } },
            errors: [{ line: 1, column: 1, message: 'Unexpected use of BDD interface instead of TDD' }]
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } },
            errors: [
                { line: 1, column: 36, message: 'Unexpected use of TDD interface instead of BDD' },
                { line: 2, column: 17, message: 'Unexpected use of TDD interface instead of BDD' }
            ]
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'exports' } },
            errors: [
                { line: 1, column: 37, message: 'Unexpected use of BDD interface instead of TDD' },
                { line: 2, column: 17, message: 'Unexpected use of BDD interface instead of TDD' }
            ]
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global BDD' },
                { message: 'Unexpected use of exports interface instead of global BDD' }
            ]
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            output: `suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'TDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global TDD' },
                { message: 'Unexpected use of exports interface instead of global TDD' }
            ]
        },
        {
            code: `import {describe as foo, it as bar} from 'mocha'; foo('foo', () => {
                bar('bar', () => {});
            });`,
            output: null,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'TDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global TDD' },
                { message: 'Unexpected use of exports interface instead of global TDD' }
            ]
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global BDD' },
                { message: 'Unexpected use of exports interface instead of global BDD' }
            ]
        },
        {
            code: `import {describe, run} from 'mocha'; describe('foo', () => {
                run();
            });`,
            output: `import {run} from 'mocha'; describe('foo', () => {
                run();
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global BDD' }
            ]
        },
        {
            code: 'import mocha, {describe} from "mocha"; describe("foo", () => {});',
            output: null,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [
                { message: 'Unexpected use of exports interface instead of global BDD' }
            ]
        }
    ]
});

describe('consistent-interface helpers', function () {
    it('getMochaImportBinding() returns null when no matching specifier exists', function () {
        const result = getMochaImportBinding(asScopeVariable({
            name: 'missing',
            defs: [{
                type: 'ImportBinding',
                node: { type: 'ImportSpecifier' },
                parent: {
                    source: { value: 'mocha' },
                    specifiers: [{ type: 'ImportSpecifier', local: { name: 'describe' } }]
                }
            }]
        }));

        assert.strictEqual(result, null);
    });

    it('getImportedName() returns string literal import names', function () {
        const result = getImportedName({
            type: 'ImportSpecifier',
            imported: { type: 'Literal', value: 'describe' },
            local: { type: 'Identifier', name: 'describe' }
        });

        assert.strictEqual(result, 'describe');
    });

    it('getImportedName() returns null for non-string literal import names', function () {
        const result = getImportedName({
            type: 'ImportSpecifier',
            imported: { type: 'Literal', value: 1 },
            local: { type: 'Identifier', name: 'describe' }
        });

        assert.strictEqual(result, null);
    });

    it('removeFullImportDeclaration() returns null without a range', function () {
        const result = removeFullImportDeclaration(
            {
                removeRange() {
                    return null;
                }
            } as unknown as Rule.RuleFixer,
            {
                getTokenAfter() {
                    return null;
                }
            } as unknown as SourceCode,
            {
                type: 'ImportDeclaration',
                source: { type: 'Literal', value: 'mocha' },
                specifiers: []
            }
        );

        assert.strictEqual(result, null);
    });

    it('removeFullImportDeclaration() removes the declaration range when there is no following token', function () {
        let removedRange: readonly [number, number] | null = null;

        removeFullImportDeclaration(
            {
                removeRange(range: readonly [number, number]) {
                    removedRange = range;
                    return null;
                }
            } as unknown as Rule.RuleFixer,
            {
                getTokenAfter() {
                    return null;
                }
            } as unknown as SourceCode,
            {
                type: 'ImportDeclaration',
                range: [0, 30],
                source: { type: 'Literal', value: 'mocha' },
                specifiers: []
            }
        );

        assert.deepStrictEqual(removedRange, [0, 30]);
    });

    it('getImportSpecifierRemovalRange() returns null when the specifier is not present', function () {
        const result = getImportSpecifierRemovalRange(
            {
                type: 'ImportSpecifier',
                imported: { type: 'Identifier', name: 'it' },
                local: { type: 'Identifier', name: 'it' },
                range: [15, 17]
            },
            []
        );

        assert.strictEqual(result, null);
    });

    it('getImportSpecifierRemovalRange() returns null when the next specifier has no range', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'describe' },
            local: { type: 'Identifier', name: 'describe' },
            range: [8, 16]
        };

        const result = getImportSpecifierRemovalRange(
            specifier,
            [
                specifier,
                {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'run' },
                    local: { type: 'Identifier', name: 'run' }
                }
            ]
        );

        assert.strictEqual(result, null);
    });

    it('getImportSpecifierRemovalRange() removes a later specifier from the previous range', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'it' },
            local: { type: 'Identifier', name: 'it' },
            range: [15, 17]
        };

        const result = getImportSpecifierRemovalRange(
            specifier,
            [
                {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'describe' },
                    local: { type: 'Identifier', name: 'describe' },
                    range: [8, 16]
                },
                specifier
            ]
        );

        assert.deepStrictEqual(result, [16, 17]);
    });

    it('getImportSpecifierRemovalRange() returns null when the previous specifier has no range', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'it' },
            local: { type: 'Identifier', name: 'it' },
            range: [15, 17]
        };

        const result = getImportSpecifierRemovalRange(
            specifier,
            [
                {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'describe' },
                    local: { type: 'Identifier', name: 'describe' }
                },
                specifier
            ]
        );

        assert.strictEqual(result, null);
    });

    it('createUnexpectedImportDescriptor() returns null when no location is available', function () {
        const result = createUnexpectedImportDescriptor(
            {
                importDeclaration: {
                    type: 'ImportDeclaration',
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: []
                },
                specifier: {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'describe' },
                    local: { type: 'Identifier', name: 'describe' }
                }
            },
            'BDD'
        );

        assert.strictEqual(result, null);
    });

    it('getMochaModuleScope() returns null without a global scope', function () {
        const result = getMochaModuleScope({ scopeManager: { globalScope: null } } as unknown as SourceCode);

        assert.strictEqual(result, null);
    });

    it('fixImportSpecifier() returns null when partial removal has no usable range', function () {
        const specifier: Parameters<typeof fixImportSpecifier>[2] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'describe' },
            local: { type: 'Identifier', name: 'describe' },
            range: [8, 16]
        };
        const result = fixImportSpecifier(
            {
                removeRange() {
                    return null;
                }
            } as unknown as Rule.RuleFixer,
            {
                getTokenAfter() {
                    return null;
                }
            } as unknown as SourceCode,
            specifier,
            {
                type: 'ImportDeclaration',
                range: [0, 30],
                source: { type: 'Literal', value: 'mocha' },
                specifiers: [
                    specifier,
                    {
                        type: 'ImportSpecifier',
                        imported: { type: 'Identifier', name: 'run' },
                        local: { type: 'Identifier', name: 'run' }
                    }
                ]
            }
        );

        assert.strictEqual(result, null);
    });

    it('reportUnexpectedImportBinding() skips reports when the binding has no location', function () {
        const reports: string[] = [];

        reportUnexpectedImportBinding(
            asRuleContext({
                sourceCode: {},
                report() {
                    reports.push('reported');
                }
            }),
            {
                importDeclaration: {
                    type: 'ImportDeclaration',
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: []
                },
                specifier: {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'describe' },
                    local: { type: 'Identifier', name: 'describe' }
                }
            },
            'BDD'
        );

        assert.deepStrictEqual(reports, []);
    });

    it('reportUnexpectedImportBindingsInModule() ignores non-module scopes', function () {
        const reports: string[] = [];

        reportUnexpectedImportBindingsInModule(
            asRuleContext({
                sourceCode: {
                    scopeManager: {
                        globalScope: {
                            childScopes: []
                        }
                    }
                },
                report() {
                    reports.push('reported');
                }
            }),
            'BDD'
        );

        assert.deepStrictEqual(reports, []);
    });
});
