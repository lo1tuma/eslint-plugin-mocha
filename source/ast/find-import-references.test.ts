import { Linter, type Rule } from 'eslint';
import assert from 'node:assert';
import type { Except } from 'type-fest';
import type { NameDetails } from '../mocha/name-details.js';
import { findImportReferencesByName } from './find-import-references.js';
import type { ResolvedReference } from './resolved-reference.js';

type MockImportDefinition = {
    node: unknown;
    parent: {
        source: Rule.Node;
    };
    type: 'ImportBinding';
};
type MockScopeVariable = {
    defs: readonly MockImportDefinition[];
    references: readonly [{
        identifier: Rule.Node;
    }];
};

function findReferenceNames(
    code: string,
    names: readonly Partial<NameDetails>[],
    importSource: string | null,
    sourceType: 'module' | 'script' = 'module'
): readonly Except<ResolvedReference, 'node'>[] {
    const linter = new Linter();
    let foundResolvedReferences: readonly Except<ResolvedReference, 'node'>[] = [];

    const testLintRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const references = findImportReferencesByName(
                        ruleContext,
                        names as (readonly NameDetails[]),
                        importSource
                    );
                    foundResolvedReferences = references.map((reference) => {
                        return {
                            path: reference.path,
                            resolvedPath: reference.resolvedPath
                        };
                    });
                }
            };
        }
    };

    const results = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testLintRule } } },
        languageOptions: { ecmaVersion: 2018, sourceType },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return foundResolvedReferences;
}

function findReferenceNamesFromMockVariable(
    variable: MockScopeVariable,
    importSource: string | null,
    names: readonly NameDetails[] = [{ path: ['foo'] }] as unknown as readonly NameDetails[]
): readonly Except<ResolvedReference, 'node'>[] {
    const identifierNode = variable.references[0]?.identifier;
    const ruleContext = {
        sourceCode: {
            getScope() {
                return {
                    childScopes: [],
                    set: new Map(),
                    upper: null
                };
            },
            scopeManager: {
                globalScope: {
                    childScopes: [{
                        type: 'module',
                        variables: [variable]
                    }]
                }
            }
        }
    } as unknown as Rule.RuleContext;

    const references = findImportReferencesByName(
        ruleContext,
        names,
        importSource
    );

    return references.map((reference) => {
        assert.strictEqual(reference.node, identifierNode.parent);

        return {
            path: reference.path,
            resolvedPath: reference.resolvedPath
        };
    });
}

function createMockImportReferenceVariable(
    definitionNode: unknown,
    source: Rule.Node
): MockScopeVariable {
    const identifierNode = {
        name: 'foo',
        parent: {
            type: 'ExpressionStatement'
        },
        type: 'Identifier'
    } as unknown as Rule.Node;

    return {
        defs: [{
            node: definitionNode,
            parent: { source },
            type: 'ImportBinding'
        }],
        references: [{ identifier: identifierNode }]
    };
}

describe('findImportReferencesByName()', function () {
    it('returns an empty array if the scope manager has no global scope', function () {
        const foundResolvedReferences = findImportReferencesByName(
            {
                sourceCode: {
                    scopeManager: {
                        globalScope: undefined
                    }
                }
            } as unknown as Rule.RuleContext,
            [{ path: ['foo'] }] as unknown as readonly NameDetails[],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array if no import statement exist', function () {
        const foundResolvedReferences = findReferenceNames('', [{ path: ['foo'] }], 'bar');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('ignores named imports whose source node is not a literal', function () {
        const foundResolvedReferences = findReferenceNamesFromMockVariable(
            createMockImportReferenceVariable(
                {
                    imported: { name: 'foo' },
                    type: 'ImportSpecifier'
                },
                {
                    name: 'bar',
                    type: 'Identifier'
                } as unknown as Rule.Node
            ),
            null
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('ignores import bindings whose definition node is not an import specifier', function () {
        const foundResolvedReferences = findReferenceNamesFromMockVariable(
            createMockImportReferenceVariable(
                {
                    imported: { name: 'foo' },
                    type: 'ImportDefaultSpecifier'
                },
                {
                    type: 'Literal',
                    value: 'bar'
                } as unknown as Rule.Node
            ),
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('ignores import specifiers whose imported name is not a string', function () {
        const foundResolvedReferences = findReferenceNamesFromMockVariable(
            createMockImportReferenceVariable(
                {
                    imported: { name: 42 },
                    type: 'ImportSpecifier'
                },
                {
                    type: 'Literal',
                    value: 'bar'
                } as unknown as Rule.Node
            ),
            'bar',
            [{ path: [42] }] as unknown as readonly NameDetails[]
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('ignores variables without an import definition', function () {
        const identifierNode = {
            name: 'foo',
            parent: {
                type: 'ExpressionStatement'
            },
            type: 'Identifier'
        } as unknown as Rule.Node;
        const foundResolvedReferences = findReferenceNamesFromMockVariable({
            defs: [],
            references: [{ identifier: identifierNode }]
        }, 'bar');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('ignores import bindings whose definition is not an import binding', function () {
        const identifierNode = {
            name: 'foo',
            parent: {
                type: 'ExpressionStatement'
            },
            type: 'Identifier'
        } as unknown as Rule.Node;
        const foundResolvedReferences = findReferenceNamesFromMockVariable({
            defs: [{
                node: {
                    imported: { name: 'foo' },
                    type: 'ImportSpecifier'
                },
                parent: {
                    source: {
                        type: 'Literal',
                        value: 'bar'
                    } as unknown as Rule.Node
                },
                type: 'Variable'
            } as unknown as MockImportDefinition],
            references: [{ identifier: identifierNode }]
        }, 'bar');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('replaces empty reference paths with the imported name', function () {
        const foundResolvedReferences = findReferenceNamesFromMockVariable(
            createMockImportReferenceVariable(
                {
                    imported: { name: 'foo' },
                    type: 'ImportSpecifier'
                },
                {
                    type: 'Literal',
                    value: 'bar'
                } as unknown as Rule.Node
            ),
            'bar',
            [{ path: ['foo'] }] as unknown as readonly NameDetails[]
        );

        const literalReference = {
            parent: {
                type: 'ExpressionStatement'
            },
            type: 'Literal',
            value: 'foo'
        } as unknown as Rule.Node;
        const emptyPathReferences = findReferenceNamesFromMockVariable({
            defs: [{
                node: {
                    imported: { name: 'foo' },
                    type: 'ImportSpecifier'
                },
                parent: {
                    source: {
                        type: 'Literal',
                        value: 'bar'
                    } as unknown as Rule.Node
                },
                type: 'ImportBinding'
            }],
            references: [{ identifier: literalReference }]
        }, 'bar');

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo'],
            resolvedPath: ['foo']
        }]);
        assert.deepStrictEqual(emptyPathReferences, [{
            path: [],
            resolvedPath: ['foo']
        }]);
    });

    it('returns an empty array if the sourceType is not an module', function () {
        const foundResolvedReferences = findReferenceNames('', [{ path: ['foo'] }], 'bar', 'script');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array when there is an import statement but the identifier doesn’t match', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo2 } from "bar2"; foo2;',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array when there is an import statement but only the source matches', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo2 } from "bar"; foo2;',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array when there is an import statement but only the identifier matches', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo } from "bar2"; foo;',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array when both the identifier and the source matches but the binding was never references', function () {
        const foundResolvedReferences = findReferenceNames('import { foo } from "bar";', [{ path: ['foo'] }], 'bar');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns the reference when both the identifier and the source matches', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo } from "bar"; foo;',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo'],
            resolvedPath: ['foo']
        }]);
    });

    it('returns every reference of a matching binding when it is referenced multiple times', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo } from "bar"; foo; foo(); foo + bar',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo'],
            resolvedPath: ['foo']
        }, {
            path: ['foo()'],
            resolvedPath: ['foo()']
        }, {
            path: ['foo'],
            resolvedPath: ['foo']
        }]);
    });

    it('returns multiple references for different matching names', function () {
        const foundResolvedReferences = findReferenceNames('import { foo, bar } from "baz"; bar; foo();', [
            { path: ['foo'] },
            { path: ['bar'] }
        ], 'baz');

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo()'],
            resolvedPath: ['foo()']
        }, {
            path: ['bar'],
            resolvedPath: ['bar']
        }]);
    });

    it('returns an empty array when the matching binding get re-assigned to a different value', function () {
        const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; foo = 42; foo;', [{
            path: ['foo']
        }], 'bar');

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns references used on the right-hand side of assignments', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo } from "bar"; let other; other = foo;',
            [{ path: ['foo'] }],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo'],
            resolvedPath: ['foo']
        }]);
    });

    it('returns an empty array when a reference is used to a shadowed variable', function () {
        const foundResolvedReferences = findReferenceNames(
            'import { foo } from "bar"; function baz() { const foo = 42; foo; }',
            [
                { path: ['foo'] }
            ],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns matching references from nested scopes', function () {
        const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; function baz() { foo; }', [
            { path: ['foo'] }
        ], 'bar');

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['foo'],
            resolvedPath: ['foo']
        }]);
    });

    it('returns matching references when using alias imports', function () {
        const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz;', [
            { path: ['foo'] }
        ], 'bar');

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['baz'],
            resolvedPath: ['foo']
        }]);
    });

    it('returns matching references from any module when the import source is null', function () {
        const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz;', [
            { path: ['foo'] }
        ], null);

        assert.deepStrictEqual(foundResolvedReferences, [{
            path: ['baz'],
            resolvedPath: ['foo']
        }]);
    });

    it('preserves dynamic paths when the imported binding is used with dynamic member access', function () {
        const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; foo[bar];', [
            { path: ['foo'] }
        ], 'bar');

        assert.strictEqual(foundResolvedReferences.length, 1);
        assert.strictEqual(foundResolvedReferences[0]?.path[0], 'foo');
        assert.strictEqual(typeof foundResolvedReferences[0]?.path[1], 'symbol');
        assert.strictEqual(foundResolvedReferences[0]?.resolvedPath[0], 'foo');
        assert.strictEqual(typeof foundResolvedReferences[0]?.resolvedPath[1], 'symbol');
    });

    it('preserves aliased dynamic paths when the imported binding is used with dynamic member access', function () {
        const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz[bar];', [
            { path: ['foo'] }
        ], 'bar');

        assert.strictEqual(foundResolvedReferences.length, 1);
        assert.strictEqual(foundResolvedReferences[0]?.path[0], 'baz');
        assert.strictEqual(typeof foundResolvedReferences[0]?.path[1], 'symbol');
        assert.strictEqual(foundResolvedReferences[0]?.resolvedPath[0], 'baz');
        assert.strictEqual(typeof foundResolvedReferences[0]?.resolvedPath[1], 'symbol');
    });

    it('returns an empty array when the global scope has no child scopes', function () {
        const foundResolvedReferences = findImportReferencesByName(
            {
                sourceCode: {
                    scopeManager: {
                        globalScope: {}
                    }
                }
            } as unknown as Rule.RuleContext,
            [{ path: ['foo'] }] as unknown as readonly NameDetails[],
            'bar'
        );

        assert.deepStrictEqual(foundResolvedReferences, []);
    });
});
