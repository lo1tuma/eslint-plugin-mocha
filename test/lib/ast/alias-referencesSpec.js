import { Linter } from 'eslint';
import assert from 'node:assert';
import { resolveAliasedReferences } from '../../../lib/ast/alias-references.js';
import { initialReferenceToResolvedReference } from '../../../lib/ast/resolved-reference.js';

function findResolvedAliasesOfGlobalVariables(code) {
    const linter = new Linter();
    let resolvedAliases = null;

    const testLintRule = {
        create(ruleContext) {
            return {
                Program() {
                    resolvedAliases = resolveAliasedReferences(
                        ruleContext.sourceCode,
                        ruleContext.sourceCode.scopeManager.globalScope.through.map((reference) => {
                            return initialReferenceToResolvedReference(ruleContext.sourceCode, reference);
                        })
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

describe('resolveAliasedReferences()', function () {
    it('returns an empty array if no initial references exist', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('');

        assert.deepStrictEqual(aliases, []);
    });

    it('returns the reference itself', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('foo');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('returns the reference multiple times when used in different scenarios', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('foo + 1; foo(); foo.bar');

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo()']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'bar']);
    });

    it('returns the alias when there is an alias', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const bar = foo;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('finds multiple references of different names', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('foo; bar;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar']);
    });

    it('extracts the correct path of a member expression', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('foo.bar');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar']);
    });

    it('extracts the correct path of a computed member expression', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'foo["bar"]'
        );

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar']);
    });

    it('traces renames via const variable declaration const x = foo; x;', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['x']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo']);
    });

    it('traces renames via const variable declaration const y = bar, x = foo; x', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['x']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo']);
    });

    it('doesn’t trace renames via assignments x = foo; x', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('var x; x = foo; x;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('traces correctly via array destructuring', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const [x] = foo; x;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('traces correctly via nested array destructuring in object destructuring', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { bar: [x] } = foo; x;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('doesn’t trace renames via property assignments x = { bar: foo }; x.bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = { bar: foo }; x.bar;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('doesn’t trace renames via var declarations var x = foo; x', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('var x = foo; x;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('doesn’t trace renames via let declarations let x = foo; x', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('let x = foo; x;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });

    it('traces renames via const member assignment const x = foo.bar; x', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = foo.bar; x;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[1].path, ['x']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar']);
    });

    it('traces property aliases of renames const declaration const x = foo; x.bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = foo; x.bar;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['x', 'bar']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar']);
    });

    it('traces renames via const destructuring const { bar } = foo; bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; bar;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar']);
    });

    it('traces multiple renames via a single const destructuring const { bar,baz } = foo; bar;baz();', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { bar, baz } = foo; bar(); baz;');

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar()']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar()']);
        assert.deepStrictEqual(aliases[2].path, ['baz']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'baz']);
    });

    it('traces renames via const destructuring alias const { foo: bar } = x; bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { foo: bar } = x; bar;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['x']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['x']);
        assert.deepStrictEqual(aliases[1].path, ['bar']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['x', 'foo']);
    });

    it('traces renames via nested const destructuring const { foo: { bar: baz} } = x; baz', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { foo: { bar: baz } } = x; baz;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['x']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['x']);
        assert.deepStrictEqual(aliases[1].path, ['baz']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['x', 'foo', 'bar']);
    });

    it('doesn’t traces renames via var destructuring var { foo: bar } = x; bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('var { foo: bar } = x; bar;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['x']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['x']);
    });

    it('doesn’t trace renames via let destructuring let { foo: bar } = x; bar', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('let { foo: bar } = x; bar;');

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['x']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['x']);
    });

    it('traces renames in a non global scope', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            '(function () { const x = foo; x;}());'
        );

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['x']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo']);
    });

    it('remains the correct resolved path when assigning a nested property', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const x = foo.bar.baz; x;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[1].path, ['x']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz']);
    });

    it('remains the correct resolved path when assigning a nested property and using deep destructuring', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { a: { b: c } } = foo.bar.baz; c;');

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[1].path, ['c']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz', 'a', 'b']);
    });

    it('traces multiple const renames in the same scope', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; const baz = bar; baz;');

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[2].path, ['baz']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'bar']);
    });

    it('traces multiple const renames with multi-level member access per alias', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const { baz: qux } = foo.bar; const { quuux } = qux.quux; quuux;'
        );

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[1].path, ['qux', 'quux']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz', 'quux']);
        assert.deepStrictEqual(aliases[2].path, ['quuux']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'bar', 'baz', 'quux', 'quuux']);
    });

    it('doesn’t trace dynamic assignments', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const { bar } = foo; const baz = bar + 42; baz;'
        );

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar']);
    });

    it('traces multiple const renames with member access in the same scope', function () {
        const aliases = findResolvedAliasesOfGlobalVariables('const { bar } = foo; const baz = bar.baz; baz;');

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar', 'baz']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[2].path, ['baz']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'bar', 'baz']);
    });

    it('traces multiple const renames in different scopes', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const { bar } = foo; (function() {const baz = bar.baz; baz;}());'
        );

        assert.strictEqual(aliases.length, 3);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar', 'baz']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz']);
        assert.deepStrictEqual(aliases[2].path, ['baz']);
        assert.deepStrictEqual(aliases[2].resolvedPath, ['foo', 'bar', 'baz']);
    });

    it('traces dynamic member expression aliases as long as the resolve to a constant string', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const member = "bar"; foo[member];'
        );

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo', 'bar']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo', 'bar']);
    });

    it('doesn’t trace dynamic member expression when they can’t be resolved statically', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'foo[Math.random()];'
        );

        assert.strictEqual(aliases.length, 0);
    });

    it('traces resolvable dynamic member expression of aliases', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const member = "baz"; const { bar } = foo; bar[member];',
            ['foo']
        );

        assert.strictEqual(aliases.length, 2);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
        assert.deepStrictEqual(aliases[1].path, ['bar', 'baz']);
        assert.deepStrictEqual(aliases[1].resolvedPath, ['foo', 'bar', 'baz']);
    });

    it('doesn’t trace unresolvable dynamic member expression aliases of aliases', function () {
        const aliases = findResolvedAliasesOfGlobalVariables(
            'const { bar } = foo; bar[Math.random()];',
            ['foo']
        );

        assert.strictEqual(aliases.length, 1);
        assert.deepStrictEqual(aliases[0].path, ['foo']);
        assert.deepStrictEqual(aliases[0].resolvedPath, ['foo']);
    });
});
