import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import type { Except } from 'type-fest';
import { suite, test } from 'mocha';
import type { NameDetails } from '../mocha/name-details.js';
import { findImportReferencesByName } from './find-import-references.js';
import type { ResolvedReference } from './resolved-reference.js';

type MockImportDefinition = {
    readonly node: unknown;
    readonly parent: {
        readonly source: Rule.Node;
    };
    readonly type: 'ImportBinding';
};
type MockScopeVariable = {
    readonly defs: readonly MockImportDefinition[];
    readonly references: readonly [{
        readonly identifier: Rule.Node;
    }];
};

function getResolvedReference(
    references: readonly Except<ResolvedReference, 'node'>[],
    index: number
): Except<ResolvedReference, 'node'> {
    const reference = references[index];

    if (reference === undefined) {
        throw new Error('Expected resolved reference to exist.');
    }
    return reference;
}

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
                    foundResolvedReferences = references.map(function (reference) {
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
    names: readonly NameDetails[] = [ { path: [ 'foo' ] } ] as unknown as readonly NameDetails[]
): readonly Except<ResolvedReference, 'node'>[] {
    const identifierNode = variable.references[0].identifier;
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
                    childScopes: [ {
                        type: 'module',
                        variables: [ variable ]
                    } ]
                }
            }
        }
    } as unknown as Rule.RuleContext;

    const references = findImportReferencesByName(
        ruleContext,
        names,
        importSource
    );

    return references.map(function (reference) {
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
        defs: [ {
            node: definitionNode,
            parent: { source },
            type: 'ImportBinding'
        } ],
        references: [ { identifier: identifierNode } ]
    };
}

suite('findImportReferencesByName()', function () {
    suite('invalid import metadata', function () {
        test('returns an empty array if the scope manager has no global scope', function () {
            const foundResolvedReferences = findImportReferencesByName(
                {
                    sourceCode: {
                        scopeManager: {
                            globalScope: undefined
                        }
                    }
                } as unknown as Rule.RuleContext,
                [ { path: [ 'foo' ] } ] as unknown as readonly NameDetails[],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns an empty array if no import statement exist', function () {
            const foundResolvedReferences = findReferenceNames('', [ { path: [ 'foo' ] } ], 'bar');

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('ignores named imports whose source node is not a literal', function () {
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

        test('ignores import bindings whose definition node is not an import specifier', function () {
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

        test('ignores import specifiers whose imported name is not a string', function () {
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
                [ { path: [ 42 ] } ] as unknown as readonly NameDetails[]
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('ignores variables without an import definition', function () {
            const identifierNode = {
                name: 'foo',
                parent: {
                    type: 'ExpressionStatement'
                },
                type: 'Identifier'
            } as unknown as Rule.Node;
            const foundResolvedReferences = findReferenceNamesFromMockVariable({
                defs: [],
                references: [ { identifier: identifierNode } ]
            }, 'bar');

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('ignores import bindings whose definition is not an import binding', function () {
            const identifierNode = {
                name: 'foo',
                parent: {
                    type: 'ExpressionStatement'
                },
                type: 'Identifier'
            } as unknown as Rule.Node;
            const foundResolvedReferences = findReferenceNamesFromMockVariable({
                defs: [ {
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
                } as unknown as MockImportDefinition ],
                references: [ { identifier: identifierNode } ]
            }, 'bar');

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('replaces empty reference paths with the imported name', function () {
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
                [ { path: [ 'foo' ] } ] as unknown as readonly NameDetails[]
            );

            const literalReference = {
                parent: {
                    type: 'ExpressionStatement'
                },
                type: 'Literal',
                value: 'foo'
            } as unknown as Rule.Node;
            const emptyPathReferences = findReferenceNamesFromMockVariable({
                defs: [ {
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
                } ],
                references: [ { identifier: literalReference } ]
            }, 'bar');

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            } ]);
            assert.deepStrictEqual(emptyPathReferences, [ {
                path: [],
                resolvedPath: [ 'foo' ]
            } ]);
        });
    });

    suite('source and binding matches', function () {
        test('returns an empty array if the sourceType is not an module', function () {
            const foundResolvedReferences = findReferenceNames('', [ { path: [ 'foo' ] } ], 'bar', 'script');

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns an empty array when there is an import statement but the identifier doesn’t match', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo2 } from "bar2"; foo2;',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns an empty array when there is an import statement but only the source matches', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo2 } from "bar"; foo2;',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns an empty array when there is an import statement but only the identifier matches', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar2"; foo;',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns an empty array when both the identifier and the source matches but the binding was never references', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar";',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns the reference when both the identifier and the source matches', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar"; foo;',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('returns every reference of a matching binding when it is referenced multiple times', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar"; foo; foo(); foo + bar',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            }, {
                path: [ 'foo()' ],
                resolvedPath: [ 'foo()' ]
            }, {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('returns multiple references for different matching names', function () {
            const foundResolvedReferences = findReferenceNames('import { foo, bar } from "baz"; bar; foo();', [
                { path: [ 'foo' ] },
                { path: [ 'bar' ] }
            ], 'baz');

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo()' ],
                resolvedPath: [ 'foo()' ]
            }, {
                path: [ 'bar' ],
                resolvedPath: [ 'bar' ]
            } ]);
        });
    });

    suite('assignments, scopes, and dynamic paths', function () {
        test('returns an empty array when the matching binding get re-assigned to a different value', function () {
            const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; foo = 42; foo;', [ {
                path: [ 'foo' ]
            } ], 'bar');

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns references used on the right-hand side of assignments', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar"; let other; other = foo;',
                [ { path: [ 'foo' ] } ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('returns an empty array when a reference is used to a shadowed variable', function () {
            const foundResolvedReferences = findReferenceNames(
                'import { foo } from "bar"; function baz() { const foo = 42; foo; }',
                [
                    { path: [ 'foo' ] }
                ],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });

        test('returns matching references from nested scopes', function () {
            const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; function baz() { foo; }', [
                { path: [ 'foo' ] }
            ], 'bar');

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'foo' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('returns matching references when using alias imports', function () {
            const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz;', [
                { path: [ 'foo' ] }
            ], 'bar');

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'baz' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('returns matching references from any module when the import source is null', function () {
            const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz;', [
                { path: [ 'foo' ] }
            ], null);

            assert.deepStrictEqual(foundResolvedReferences, [ {
                path: [ 'baz' ],
                resolvedPath: [ 'foo' ]
            } ]);
        });

        test('preserves dynamic paths when the imported binding is used with dynamic member access', function () {
            const foundResolvedReferences = findReferenceNames('import { foo } from "bar"; foo[bar];', [
                { path: [ 'foo' ] }
            ], 'bar');

            assert.strictEqual(foundResolvedReferences.length, 1);
            assert.strictEqual(getResolvedReference(foundResolvedReferences, 0).path[0], 'foo');
            assert.strictEqual(typeof getResolvedReference(foundResolvedReferences, 0).path[1], 'symbol');
            assert.strictEqual(getResolvedReference(foundResolvedReferences, 0).resolvedPath[0], 'foo');
            assert.strictEqual(typeof getResolvedReference(foundResolvedReferences, 0).resolvedPath[1], 'symbol');
        });

        test('preserves aliased dynamic paths when the imported binding is used with dynamic member access', function () {
            const foundResolvedReferences = findReferenceNames('import { foo as baz } from "bar"; baz[bar];', [
                { path: [ 'foo' ] }
            ], 'bar');

            assert.strictEqual(foundResolvedReferences.length, 1);
            assert.strictEqual(getResolvedReference(foundResolvedReferences, 0).path[0], 'baz');
            assert.strictEqual(typeof getResolvedReference(foundResolvedReferences, 0).path[1], 'symbol');
            assert.strictEqual(getResolvedReference(foundResolvedReferences, 0).resolvedPath[0], 'baz');
            assert.strictEqual(typeof getResolvedReference(foundResolvedReferences, 0).resolvedPath[1], 'symbol');
        });
    });

    suite('missing module scopes', function () {
        test('returns an empty array when the global scope has no child scopes', function () {
            const foundResolvedReferences = findImportReferencesByName(
                {
                    sourceCode: {
                        scopeManager: {
                            globalScope: {
                                childScopes: []
                            }
                        }
                    }
                } as unknown as Rule.RuleContext,
                [ { path: [ 'foo' ] } ] as unknown as readonly NameDetails[],
                'bar'
            );

            assert.deepStrictEqual(foundResolvedReferences, []);
        });
    });
});
