import assert from 'node:assert';
import { Linter, type Rule, type Scope, type SourceCode } from 'eslint';
import { suite, test } from 'mocha';
import { resolveAliasedReferences } from './alias-references.ts';
import { initialReferenceToResolvedReference, type ResolvedReference } from './resolved-reference.ts';

function findResolvedAliasesOfGlobalVariables(code: string): readonly ResolvedReference[] {
    const linter = new Linter();
    let resolvedAliases: readonly ResolvedReference[] = [];

    const testLintRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    resolvedAliases = resolveAliasedReferences(
                        ruleContext.sourceCode,
                        ruleContext.sourceCode.scopeManager.globalScope?.through.map(function (reference) {
                            return initialReferenceToResolvedReference(reference, ruleContext.sourceCode);
                        }) ?? []
                    );
                }
            };
        }
    };

    const results = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testLintRule } } },
        languageOptions: { ecmaVersion: 2018, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return resolvedAliases;
}

function getAlias(aliases: readonly ResolvedReference[], index: number): ResolvedReference {
    const alias = aliases[index];

    if (alias === undefined) {
        throw new Error('Expected alias to exist.');
    }
    return alias;
}

function createEmptyScope(): Scope.Scope {
    return {
        set: new Map(),
        childScopes: [],
        upper: null
    } as unknown as Scope.Scope;
}

function createSourceCodeWithScope(scope: Readonly<Scope.Scope>): SourceCode {
    return {
        getScope() {
            return scope;
        }
    } as unknown as SourceCode;
}

function asNode(node: Readonly<Record<string, unknown>>): Rule.Node {
    return node as unknown as Rule.Node;
}

function createConstAliasReference(aliasName: string, originalName: string): ResolvedReference {
    const variableDeclaration = asNode({ type: 'VariableDeclaration', kind: 'const' });
    const identifier = asNode({
        type: 'Identifier',
        name: originalName
    });
    const aliasIdentifier = asNode({
        type: 'Identifier',
        name: aliasName
    });
    const variableDeclarator = asNode({
        type: 'VariableDeclarator',
        id: aliasIdentifier,
        init: identifier,
        parent: variableDeclaration
    });

    identifier.parent = variableDeclarator;
    aliasIdentifier.parent = variableDeclarator;

    return {
        node: variableDeclarator,
        path: [ originalName ],
        resolvedPath: [ originalName ]
    };
}

suite('resolveAliasedReferences()', function () {
    suite('direct references and simple aliases', function () {
        test('returns an empty array if no initial references exist', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('');

            assert.deepStrictEqual(aliases, []);
        });

        test('returns the reference itself', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('foo');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('returns the reference multiple times when used in different scenarios', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('foo + 1; foo(); foo.bar');

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo()' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('returns the alias when there is an alias', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const bar = foo;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('finds multiple references of different names', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('foo; bar;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar' ]);
        });

        test('extracts the correct path of a member expression', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('foo.bar');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar' ]);
        });

        test('extracts the correct path of a computed member expression', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'foo["bar"]'
            );

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar' ]);
        });

        test('traces renames via const variable declaration const x = foo; x;', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo' ]);
        });
    });

    suite('declaration and destructuring aliases', function () {
        test('traces renames via const variable declaration const y = bar, x = foo; x', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo' ]);
        });

        test('doesn’t trace renames via assignments x = foo; x', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('var x; x = foo; x;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('traces correctly via array destructuring', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const [x] = foo; x;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('traces correctly via nested array destructuring in object destructuring', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { bar: [x] } = foo; x;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('doesn’t trace renames via property assignments x = { bar: foo }; x.bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = { bar: foo }; x.bar;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('doesn’t trace renames via var declarations var x = foo; x', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('var x = foo; x;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('doesn’t trace renames via let declarations let x = foo; x', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('let x = foo; x;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('traces renames via const member assignment const x = foo.bar; x', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo.bar; x;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
        });
    });

    suite('call, member, and object aliases', function () {
        test('traces property aliases of renames const declaration const x = foo; x.bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x.bar;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('traces call aliases of renames const declaration const x = foo; x()', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x();');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x()' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo()' ]);
        });

        test('traces member call aliases of renames const declaration const x = foo; x.bar()', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x.bar();');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x', 'bar()' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar()' ]);
        });

        test('does not treat member access after aliased calls as direct call aliases', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x().bar;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x()', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('ignores aliased calls backed by dynamic member access', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo[bar]; x();');

            assert.deepStrictEqual(aliases, []);
        });

        test('traces renames via const destructuring const { bar } = foo; bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; bar;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('traces multiple renames via a single const destructuring const { bar,baz } = foo; bar;baz();', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { bar, baz } = foo; bar(); baz;');

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar()' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar()' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).path, [ 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'baz' ]);
        });

        test('traces renames via const destructuring alias const { foo: bar } = x; bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { foo: bar } = x; bar;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'x', 'foo' ]);
        });
    });

    suite('nested patterns and scoped aliases', function () {
        test('traces multiple bindings from a nested object pattern', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { foo: { bar, baz } } = x; bar; baz;');

            assert.deepStrictEqual(
                aliases.map(function (alias) {
                    return alias.resolvedPath;
                }),
                [ [ 'x' ], [ 'x', 'foo', 'bar' ], [ 'x', 'foo', 'baz' ] ]
            );
        });

        test('keeps the original reference when alias scope lookup cannot resolve the declared binding', function () {
            const originalReference = createConstAliasReference('alias', 'foo');
            const aliases = resolveAliasedReferences(
                createSourceCodeWithScope(createEmptyScope()),
                [ originalReference ]
            );

            assert.deepStrictEqual(aliases, [ originalReference ]);
        });

        test('traces renames via nested const destructuring const { foo: { bar: baz} } = x; baz', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { foo: { bar: baz } } = x; baz;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'x', 'foo', 'bar' ]);
        });

        test('doesn’t traces renames via var destructuring var { foo: bar } = x; bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('var { foo: bar } = x; bar;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'x' ]);
        });

        test('doesn’t trace renames via let destructuring let { foo: bar } = x; bar', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('let { foo: bar } = x; bar;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'x' ]);
        });

        test('traces renames in a non global scope', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                '(function () { const x = foo; x;}());'
            );

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo' ]);
        });

        test('remains the correct resolved path when assigning a nested property', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const x = foo.bar.baz; x;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'x' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz' ]);
        });

        test('remains the correct resolved path when assigning a nested property and using deep destructuring', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { a: { b: c } } = foo.bar.baz; c;');

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'c' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz', 'a', 'b' ]);
        });
    });

    suite('multiple aliases and dynamic members', function () {
        test('traces multiple const renames in the same scope', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; const baz = bar; baz;');

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).path, [ 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('traces multiple const renames with multi-level member access per alias', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const { baz: qux } = foo.bar; const { quuux } = qux.quux; quuux;'
            );

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'qux', 'quux' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz', 'quux' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).path, [ 'quuux' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'bar', 'baz', 'quux', 'quuux' ]);
        });

        test('doesn’t trace dynamic assignments', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const { bar } = foo; const baz = bar + 42; baz;'
            );

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('traces multiple const renames with member access in the same scope', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; const baz = bar.baz; baz;');

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).path, [ 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'bar', 'baz' ]);
        });

        test('traces multiple const renames in different scopes', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const { bar } = foo; (function() {const baz = bar.baz; baz;}());'
            );

            assert.strictEqual(aliases.length, 3);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).path, [ 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 2).resolvedPath, [ 'foo', 'bar', 'baz' ]);
        });

        test('traces dynamic member expression aliases as long as the resolve to a constant string', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const member = "bar"; foo[member];'
            );

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo', 'bar' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo', 'bar' ]);
        });

        test('doesn’t trace dynamic member expression when they can’t be resolved statically', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'foo[Math.random()];'
            );

            assert.strictEqual(aliases.length, 0);
        });

        test('traces resolvable dynamic member expression of aliases', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const member = "baz"; const { bar } = foo; bar[member];'
            );

            assert.strictEqual(aliases.length, 2);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).path, [ 'bar', 'baz' ]);
            assert.deepStrictEqual(getAlias(aliases, 1).resolvedPath, [ 'foo', 'bar', 'baz' ]);
        });
    });

    suite('unresolved dynamic members and rest patterns', function () {
        test('doesn’t trace unresolvable dynamic member expression aliases of aliases', function () {
            const aliases = findResolvedAliasesOfGlobalVariables(
                'const { bar } = foo; bar[Math.random()];'
            );

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });

        test('ignores rest elements in object patterns', function () {
            const aliases = findResolvedAliasesOfGlobalVariables('const { ...rest } = foo; rest;');

            assert.strictEqual(aliases.length, 1);
            assert.deepStrictEqual(getAlias(aliases, 0).path, [ 'foo' ]);
            assert.deepStrictEqual(getAlias(aliases, 0).resolvedPath, [ 'foo' ]);
        });
    });
});
