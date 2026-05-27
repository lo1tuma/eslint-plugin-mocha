import { Linter, type Rule } from 'eslint';
import assert from 'node:assert';
import type { Except } from 'type-fest';
import type { NameDetails } from '../mocha/name-details.js';
import {
    findImportReferencesByName,
    isExclusiveNamedImportBindingWithMatchingSource,
    isImportSpecifierNode,
    replaceFirstSegment
} from './find-import-references.js';
import type { ResolvedReference } from './resolved-reference.js';

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

    it('replaceFirstSegment() handles empty constant paths without throwing', function () {
        assert.deepStrictEqual(replaceFirstSegment([], 'foo'), ['foo']);
    });

    it('isImportSpecifierNode() rejects specifiers without imported names', function () {
        const result = isImportSpecifierNode({
            type: 'ImportSpecifier',
            imported: {}
        });

        assert.strictEqual(result, false);
    });

    it('isImportSpecifierNode() rejects nodes with the wrong type', function () {
        const result = isImportSpecifierNode({
            type: 'Identifier',
            imported: {
                name: 'foo'
            }
        });

        assert.strictEqual(result, false);
    });

    it('isImportSpecifierNode() rejects nodes with non-record imported bindings', function () {
        const result = isImportSpecifierNode({
            type: 'ImportSpecifier',
            imported: 'foo'
        });

        assert.strictEqual(result, false);
    });

    it('isExclusiveNamedImportBindingWithMatchingSource() rejects non-literal import sources', function () {
        const result = isExclusiveNamedImportBindingWithMatchingSource(
            {
                defs: [{
                    type: 'ImportBinding',
                    node: {
                        type: 'ImportSpecifier',
                        imported: { name: 'foo' }
                    },
                    parent: {
                        source: {
                            type: 'Identifier',
                            value: 'bar'
                        }
                    }
                }],
                references: []
            } as unknown as Parameters<typeof isExclusiveNamedImportBindingWithMatchingSource>[0],
            'bar'
        );

        assert.strictEqual(result, false);
    });

    it('isExclusiveNamedImportBindingWithMatchingSource() rejects variables without definitions', function () {
        const result = isExclusiveNamedImportBindingWithMatchingSource(
            {
                defs: [],
                references: []
            } as unknown as Parameters<typeof isExclusiveNamedImportBindingWithMatchingSource>[0],
            'bar'
        );

        assert.strictEqual(result, false);
    });

    it('isExclusiveNamedImportBindingWithMatchingSource() rejects non-import definitions', function () {
        const result = isExclusiveNamedImportBindingWithMatchingSource(
            {
                defs: [{
                    type: 'Variable',
                    node: {
                        type: 'ImportSpecifier',
                        imported: { name: 'foo' }
                    },
                    parent: {
                        source: {
                            type: 'Literal',
                            value: 'bar'
                        }
                    }
                }],
                references: []
            } as unknown as Parameters<typeof isExclusiveNamedImportBindingWithMatchingSource>[0],
            'bar'
        );

        assert.strictEqual(result, false);
    });
});
