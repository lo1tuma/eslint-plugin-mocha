import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import type { Except } from 'type-fest';
import { suite, test } from 'mocha';
import type { NameDetails } from '../mocha/name-details.ts';
import { findGlobalReferencesByName } from './find-global-references.ts';
import type { ResolvedReference } from './resolved-reference.ts';

function findReferenceNames(
    code: string,
    names: readonly Partial<NameDetails>[],
    { globals = {} }: Record<string, unknown> = {}
): readonly Except<ResolvedReference, 'node'>[] {
    const linter = new Linter();
    let foundResolvedReferences: readonly Except<ResolvedReference, 'node'>[] = [];

    const testLintRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const references = findGlobalReferencesByName(ruleContext, names as (readonly NameDetails[]));
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
        languageOptions: { ecmaVersion: 2018, sourceType: 'script', globals },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return foundResolvedReferences;
}

suite('findGlobalReferencesByName()', function () {
    test('returns an empty array if the scope manager has no global scope', function () {
        const foundResolvedReferences = findGlobalReferencesByName({
            sourceCode: {
                scopeManager: {
                    globalScope: null
                }
            }
        } as Rule.RuleContext, [ { path: [ 'foo' ] } ] as unknown as readonly NameDetails[]);

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    test('returns an empty array if no match was found', function () {
        const foundResolvedReferences = findReferenceNames('bar;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    test('returns an empty array if a matched identifier was found but it it refers to a local definition', function () {
        const foundResolvedReferences = findReferenceNames('var foo;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    test('finds a matching reference when there is no resolved globals', function () {
        const foundResolvedReferences = findReferenceNames('foo;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [ { path: [ 'foo' ], resolvedPath: [ 'foo' ] } ]);
    });

    test('finds a matching reference when used in a call expression', function () {
        const foundResolvedReferences = findReferenceNames('foo();', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [ { path: [ 'foo()' ], resolvedPath: [ 'foo()' ] } ]);
    });

    test('finds a matching reference when used in a member expression', function () {
        const foundResolvedReferences = findReferenceNames('foo.bar;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [ { path: [ 'foo', 'bar' ], resolvedPath: [ 'foo', 'bar' ] } ]);
    });

    test('finds a matching reference when used in an assignment expression', function () {
        const foundResolvedReferences = findReferenceNames('var bar = foo;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [ { path: [ 'foo' ], resolvedPath: [ 'foo' ] } ]);
    });

    test('finds a matching reference when there is a resolved global', function () {
        const foundResolvedReferences = findReferenceNames(
            'foo',
            [ { path: [ 'foo' ] } ],
            { globals: { foo: false } }
        );

        assert.deepStrictEqual(foundResolvedReferences, [ { path: [ 'foo' ], resolvedPath: [ 'foo' ] } ]);
    });

    test('finds multiple matching references for the same name', function () {
        const foundResolvedReferences = findReferenceNames('foo(); foo.bar;', [ { path: [ 'foo' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [
            { path: [ 'foo()' ], resolvedPath: [ 'foo()' ] },
            { path: [ 'foo', 'bar' ], resolvedPath: [ 'foo', 'bar' ] }
        ]);
    });

    test('finds multiple matching references of different names', function () {
        const foundResolvedReferences = findReferenceNames('foo; bar;', [ { path: [ 'foo' ] }, { path: [ 'bar' ] } ]);

        assert.deepStrictEqual(foundResolvedReferences, [
            { path: [ 'foo' ], resolvedPath: [ 'foo' ] },
            { path: [ 'bar' ], resolvedPath: [ 'bar' ] }
        ]);
    });
});
