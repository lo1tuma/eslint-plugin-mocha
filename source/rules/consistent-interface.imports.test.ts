import type { Rule, SourceCode } from 'eslint';
import assert from 'node:assert';
import {
    fixImportSpecifier,
    getMochaImportBinding,
    reportUnexpectedImportBinding
} from './consistent-interface.js';

function asImportDeclaration(node: Record<string, unknown>): Parameters<typeof fixImportSpecifier>[3] {
    return node as unknown as Parameters<typeof fixImportSpecifier>[3];
}

function asScopeVariable(variable: Record<string, unknown>): Parameters<typeof getMochaImportBinding>[0] {
    return variable as unknown as Parameters<typeof getMochaImportBinding>[0];
}

function asRuleContext(ruleContext: Record<string, unknown>): Rule.RuleContext {
    return ruleContext as unknown as Rule.RuleContext;
}

describe('consistent-interface import names', function () {
    it('getMochaImportBinding() returns null for non-import mocha definitions', function () {
        const result = getMochaImportBinding(asScopeVariable({
            name: 'describe',
            defs: [{
                type: 'Variable',
                node: { type: 'ImportSpecifier' },
                parent: {
                    source: { value: 'mocha' },
                    specifiers: [{ type: 'ImportSpecifier', local: { name: 'describe' } }]
                }
            }]
        }));

        assert.strictEqual(result, null);
    });

    it('fixImportSpecifier() removes every supported interface import name', function () {
        for (
            const importedName of [
                'describe',
                'context',
                'suite',
                'it',
                'specify',
                'test',
                'before',
                'after',
                'beforeEach',
                'afterEach',
                'suiteSetup',
                'suiteTeardown',
                'setup',
                'teardown'
            ]
        ) {
            let removedRange: readonly [number, number] | null = null;
            const specifier: Parameters<typeof fixImportSpecifier>[2] = {
                type: 'ImportSpecifier',
                imported: { type: 'Identifier', name: importedName },
                local: { type: 'Identifier', name: importedName },
                range: [8, 16]
            };

            fixImportSpecifier(
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
                specifier,
                asImportDeclaration({
                    type: 'ImportDeclaration',
                    attributes: [],
                    range: [0, 30],
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: [specifier]
                })
            );

            assert.deepStrictEqual(removedRange, [0, 30]);
        }
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

        assert.deepStrictEqual(reports, []);
    });

    it('reportUnexpectedImportBinding() ignores non-string literal imports', function () {
        const reports: string[] = [];

        reportUnexpectedImportBinding(
            asRuleContext({
                sourceCode: {},
                report() {
                    reports.push('reported');
                }
            }),
            {
                importDeclaration: asImportDeclaration({
                    type: 'ImportDeclaration',
                    attributes: [],
                    loc: {
                        start: { line: 1, column: 0 },
                        end: { line: 1, column: 30 }
                    },
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: []
                }),
                specifier: {
                    type: 'ImportSpecifier',
                    imported: { type: 'Literal', value: 1 },
                    local: {
                        type: 'Identifier',
                        loc: {
                            start: { line: 1, column: 9 },
                            end: { line: 1, column: 17 }
                        },
                        name: 'describe'
                    },
                    loc: {
                        start: { line: 1, column: 9 },
                        end: { line: 1, column: 17 }
                    }
                }
            },
            'BDD'
        );

        assert.deepStrictEqual(reports, []);
    });

    it('reportUnexpectedImportBinding() skips auto-fixes for non-Identifier imports', function () {
        let observedDescriptor: Rule.ReportDescriptor | null = null;

        reportUnexpectedImportBinding(
            asRuleContext({
                sourceCode: {},
                report(descriptor: Rule.ReportDescriptor) {
                    observedDescriptor = descriptor;
                }
            }),
            {
                importDeclaration: asImportDeclaration({
                    type: 'ImportDeclaration',
                    attributes: [],
                    loc: {
                        start: { line: 1, column: 0 },
                        end: { line: 1, column: 35 }
                    },
                    range: [0, 35],
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: [{
                        type: 'ImportSpecifier',
                        imported: {
                            type: 'Literal',
                            value: 'describe',
                            name: 'describe'
                        },
                        local: {
                            type: 'Identifier',
                            loc: {
                                start: { line: 1, column: 9 },
                                end: { line: 1, column: 17 }
                            },
                            name: 'describe'
                        },
                        loc: {
                            start: { line: 1, column: 9 },
                            end: { line: 1, column: 17 }
                        },
                        range: [9, 17]
                    }]
                }),
                specifier: {
                    type: 'ImportSpecifier',
                    imported: {
                        type: 'Literal',
                        value: 'describe',
                        name: 'describe'
                    },
                    local: {
                        type: 'Identifier',
                        loc: {
                            start: { line: 1, column: 9 },
                            end: { line: 1, column: 17 }
                        },
                        name: 'describe'
                    },
                    loc: {
                        start: { line: 1, column: 9 },
                        end: { line: 1, column: 17 }
                    },
                    range: [9, 17]
                } as unknown as Parameters<typeof reportUnexpectedImportBinding>[1]['specifier']
            },
            'BDD'
        );

        if (observedDescriptor === null) {
            throw new Error('Expected a report descriptor.');
        }

        assert.strictEqual('fix' in observedDescriptor, false);
    });

    it('reportUnexpectedImportBinding() skips auto-fixes when the declaration mixes specifier types', function () {
        let observedDescriptor: Rule.ReportDescriptor | null = null;

        reportUnexpectedImportBinding(
            asRuleContext({
                sourceCode: {},
                report(descriptor: Rule.ReportDescriptor) {
                    observedDescriptor = descriptor;
                }
            }),
            {
                importDeclaration: asImportDeclaration({
                    type: 'ImportDeclaration',
                    attributes: [],
                    loc: {
                        start: { line: 1, column: 0 },
                        end: { line: 1, column: 35 }
                    },
                    range: [0, 35],
                    source: { type: 'Literal', value: 'mocha' },
                    specifiers: [
                        {
                            type: 'ImportDefaultSpecifier',
                            local: { type: 'Identifier', name: 'mocha' },
                            range: [7, 12]
                        },
                        {
                            type: 'ImportSpecifier',
                            imported: { type: 'Identifier', name: 'describe' },
                            local: {
                                type: 'Identifier',
                                loc: {
                                    start: { line: 1, column: 14 },
                                    end: { line: 1, column: 22 }
                                },
                                name: 'describe'
                            },
                            loc: {
                                start: { line: 1, column: 14 },
                                end: { line: 1, column: 22 }
                            },
                            range: [14, 22]
                        }
                    ]
                }),
                specifier: {
                    type: 'ImportSpecifier',
                    imported: { type: 'Identifier', name: 'describe' },
                    local: {
                        type: 'Identifier',
                        loc: {
                            start: { line: 1, column: 14 },
                            end: { line: 1, column: 22 }
                        },
                        name: 'describe'
                    },
                    loc: {
                        start: { line: 1, column: 14 },
                        end: { line: 1, column: 22 }
                    },
                    range: [14, 22]
                }
            },
            'BDD'
        );

        if (observedDescriptor === null) {
            throw new Error('Expected a report descriptor.');
        }

        assert.strictEqual('fix' in observedDescriptor, false);
    });
});
