import { Linter } from 'eslint';
import assert from 'node:assert';
import { findImportReferencesByName } from '../../../lib/ast/find-import-references.js';

function findReferenceNames(code, names, importSource, sourceType = 'module') {
    const linter = new Linter();
    let foundResolvedReferences = null;

    const testLintRule = {
        create(ruleContext) {
            return {
                Program() {
                    const references = findImportReferencesByName(ruleContext, names, importSource);
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
});
