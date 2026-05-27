import type { Rule, Scope, SourceCode } from 'eslint';
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
    reportUnexpectedImportBindingsInModule
} from './consistent-interface.js';

function asRuleContext(ruleContext: Record<string, unknown>): Rule.RuleContext {
    return ruleContext as unknown as Rule.RuleContext;
}

function asScopeVariable(variable: Record<string, unknown>): Scope.Variable {
    return variable as unknown as Scope.Variable;
}

function asImportDeclaration(node: Record<string, unknown>): Parameters<typeof removeFullImportDeclaration>[2] {
    return node as unknown as Parameters<typeof removeFullImportDeclaration>[2];
}

describe('consistent-interface helpers', function () {
    it('exposes the expected default options', function () {
        assert.deepStrictEqual(consistentInterfaceRule.meta?.defaultOptions, [{ interface: 'BDD' }]);
    });

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

    it('getImportedName() returns identifier import names', function () {
        const result = getImportedName({
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'describe' },
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
        let didReadNextToken = false;
        let didRemoveRange = false;
        const result = removeFullImportDeclaration(
            {
                removeRange() {
                    didRemoveRange = true;
                    return null;
                }
            } as unknown as Rule.RuleFixer,
            {
                getTokenAfter() {
                    didReadNextToken = true;
                    return null;
                }
            } as unknown as SourceCode,
            asImportDeclaration({
                type: 'ImportDeclaration',
                attributes: [],
                source: { type: 'Literal', value: 'mocha' },
                specifiers: []
            })
        );

        assert.strictEqual(result, null);
        assert.strictEqual(didReadNextToken, false);
        assert.strictEqual(didRemoveRange, false);
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
            asImportDeclaration({
                type: 'ImportDeclaration',
                attributes: [],
                range: [0, 30],
                source: { type: 'Literal', value: 'mocha' },
                specifiers: []
            })
        );

        assert.deepStrictEqual(removedRange, [0, 30]);
    });

    it('getImportSpecifierRemovalRange() returns null when the specifier is not present', function () {
        const specifier = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'it' },
            local: { type: 'Identifier', name: 'it' }
        };

        Object.defineProperty(specifier, 'range', {
            get() {
                throw new Error('Expected an absent specifier to short-circuit before reading its range.');
            }
        });

        const specifiers: Parameters<typeof getImportSpecifierRemovalRange>[1] = [];

        Object.defineProperty(specifiers, '-2', {
            value: {
                range: [0, 1]
            }
        });

        const result = getImportSpecifierRemovalRange(
            specifier as Parameters<typeof getImportSpecifierRemovalRange>[0],
            specifiers
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

    it('getImportSpecifierRemovalRange() returns null when the first specifier has no range', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'describe' },
            local: { type: 'Identifier', name: 'describe' }
        };

        const result = getImportSpecifierRemovalRange(
            specifier,
            [
                specifier,
                {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'run' },
                    local: { type: 'Identifier', name: 'run' },
                    range: [20, 23]
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

    it('getImportSpecifierRemovalRange() returns null when the current specifier has no range', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'it' },
            local: { type: 'Identifier', name: 'it' }
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

        assert.strictEqual(result, null);
    });

    it('getImportSpecifierRemovalRange() returns null when the previous specifier slot is empty', function () {
        const specifier: Parameters<typeof getImportSpecifierRemovalRange>[0] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'it' },
            local: { type: 'Identifier', name: 'it' },
            range: [15, 17]
        };
        const specifiers = Array.from<Parameters<typeof getImportSpecifierRemovalRange>[0]>({ length: 2 });

        specifiers[1] = specifier;

        const result = getImportSpecifierRemovalRange(specifier, specifiers);

        assert.strictEqual(result, null);
    });

    it('createUnexpectedImportDescriptor() returns null when no location is available', function () {
        const result = createUnexpectedImportDescriptor(
            {
                importDeclaration: asImportDeclaration({
                    type: 'ImportDeclaration',
                    attributes: [],
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: []
                }),
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

    it('getMochaModuleScope() returns null without child scopes', function () {
        const result = getMochaModuleScope({
            scopeManager: {
                globalScope: {}
            }
        } as unknown as SourceCode);

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
            asImportDeclaration({
                type: 'ImportDeclaration',
                attributes: [],
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
            })
        );

        assert.strictEqual(result, null);
    });

    it('fixImportSpecifier() returns null when the declaration includes non-named specifiers', function () {
        const specifier: Parameters<typeof fixImportSpecifier>[2] = {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'describe' },
            local: { type: 'Identifier', name: 'describe' },
            range: [15, 23]
        };
        let didRemoveRange = false;
        const result = fixImportSpecifier(
            {
                removeRange() {
                    didRemoveRange = true;
                    return null;
                }
            } as unknown as Rule.RuleFixer,
            {
                getTokenAfter() {
                    return null;
                }
            } as unknown as SourceCode,
            specifier,
            asImportDeclaration({
                type: 'ImportDeclaration',
                attributes: [],
                range: [0, 35],
                source: { type: 'Literal', value: 'mocha' },
                specifiers: [
                    {
                        type: 'ImportDefaultSpecifier',
                        local: { type: 'Identifier', name: 'mocha' },
                        range: [7, 12]
                    },
                    specifier
                ]
            })
        );

        assert.strictEqual(result, null);
        assert.strictEqual(didRemoveRange, false);
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
