import { Linter } from 'eslint';
import assert from 'node:assert';
import { findMochaVariableCalls } from '../../../lib/ast/find-mocha-variable-calls.js';

function findCalls(code, names, { globals = {} } = {}) {
    const linter = new Linter();
    let calls = null;

    const testLintRule = {
        create(ruleContext) {
            return {
                'Program:exit'() {
                    calls = findMochaVariableCalls(ruleContext, names);
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

    return calls;
}

describe('findMochaVariableCalls()', function () {
    it('returns an empty array if no match was found', function () {
        const calls = findCalls(
            'bar()',
            [{ path: ['foo'] }]
        );

        assert.deepStrictEqual(calls, []);
    });

    it('returns an empty array if a matched identifier was found but it was not a CallExpression', function () {
        const calls = findCalls(
            'foo;',
            [{ path: ['foo'] }]
        );

        assert.deepStrictEqual(calls, []);
    });

    it('returns an empty array if a matched identifier was found but it it refers to a local definition', function () {
        const calls = findCalls(
            'var foo;',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.deepStrictEqual(calls, []);
    });

    it('finds a matching call when there is no resolved globals', function () {
        const calls = findCalls(
            'foo()',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo()']);
    });

    it('finds a matching call when there is a resolved global', function () {
        const calls = findCalls(
            'foo()',
            [{ path: ['foo'], normalizedPath: ['foo()'] }],
            { globals: { foo: false } }
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo()']);
    });

    it('finds a matching call when there searching for a path', function () {
        const calls = findCalls(
            'foo.bar()',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }],
            { globals: { foo: false } }
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo', 'bar()']);
    });

    it('doesn’t find something when looking for a path but the searched path was not used', function () {
        const calls = findCalls(
            'foo()',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }],
            { globals: { foo: false } }
        );

        assert.strictEqual(calls.length, 0);
    });

    it('finds multiple matching calls', function () {
        const calls = findCalls(
            'foo(); foo();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(calls[0].path, ['foo()']);
        assert.deepStrictEqual(calls[1].path, ['foo()']);
    });

    it('finds multiple matching calls of different names', function () {
        const calls = findCalls(
            'foo(); bar();',
            [
                { path: ['foo'], normalizedPath: ['foo()'] },
                { path: ['bar'], normalizedPath: ['bar()'] }
            ]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(calls[0].path, ['foo()']);
        assert.deepStrictEqual(calls[1].path, ['bar()']);
    });

    it('finds multiple matching calls with property access', function () {
        const calls = findCalls(
            'foo.x(); bar.x();',
            [
                { path: ['foo', 'x'], normalizedPath: ['foo', 'x()'] },
                { path: ['bar', 'x'], normalizedPath: ['bar', 'x()'] }
            ]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(calls[0].path, ['foo', 'x()']);
        assert.deepStrictEqual(calls[1].path, ['bar', 'x()']);
    });

    it('extracts the correct path of a member expression', function () {
        const calls = findCalls(
            'foo.bar()',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo', 'bar()']);
    });

    it('extracts the correct path of a computed member expression', function () {
        const calls = findCalls(
            'foo["bar"]()',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo', 'bar()']);
    });

    it('traces function calls renames via const variable declaration const x = foo; x()', function () {
        const calls = findCalls(
            'const x = foo; x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo()']);
    });

    it('traces renames via const variable declaration const y = bar, x = foo; x()', function () {
        const calls = findCalls(
            'const x = foo; x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo()']);
    });

    it('doesn’t trace renames via assignments x = foo; x()', function () {
        const calls = findCalls(
            'x = foo; x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('doesn’t trace renames via properties x = { bar: foo }; x.bar()', function () {
        const calls = findCalls(
            'const x = { bar: foo }; x.bar();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('doesn’t trace renames via var declarations var x = foo; x()', function () {
        const calls = findCalls(
            'var x = foo; x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('doesn’t trace renames via let declarations let x = foo; x()', function () {
        const calls = findCalls(
            'let x = foo; x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('traces renames via const member assignment const x = foo.bar; x()', function () {
        const calls = findCalls(
            'const x = foo.bar; x();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
    });

    it('traces property calls of renames const declaration const x = foo; x.bar()', function () {
        const calls = findCalls(
            'const x = foo; x.bar();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x', 'bar()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
    });

    it('traces renames via const destructuring const { bar } = foo; bar()', function () {
        const calls = findCalls(
            'const { bar } = foo; bar();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['bar()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
    });

    it('traces multiple renames via a single const destructuring const { bar,baz } = foo; bar();baz();', function () {
        const calls = findCalls(
            'const { bar, baz } = foo; bar(); baz();',
            [
                { path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] },
                { path: ['foo', 'baz'], normalizedPath: ['foo', 'baz()'] }
            ]
        );

        assert.strictEqual(calls.length, 2);
        assert.deepStrictEqual(calls[0].path, ['bar()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
        assert.deepStrictEqual(calls[1].path, ['baz()']);
        assert.deepStrictEqual(calls[1].resolvedPath, ['foo', 'baz()']);
    });

    it('traces renames via const destructuring alias const { foo: bar } = x; bar()', function () {
        const calls = findCalls(
            'const { foo: bar } = x; bar();',
            [{ path: ['x', 'foo'], normalizedPath: ['x', 'foo()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['bar()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['x', 'foo()']);
    });

    it('traces renames via nested const destructuring const { foo: { bar: baz} } = x; baz()', function () {
        const calls = findCalls(
            'const { foo: { bar: baz } } = x; baz();',
            [{ path: ['x', 'foo', 'bar'], normalizedPath: ['x', 'foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['baz()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['x', 'foo', 'bar()']);
    });

    it('doesn’t traces renames via var destructuring var { foo: bar } = x; bar()', function () {
        const calls = findCalls(
            'var { foo: bar } = x; bar();',
            [{ path: ['x', 'foo'], normalizedPath: ['x', 'foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('doesn’t trace renames via let destructuring let { foo: bar } = x; bar()', function () {
        const calls = findCalls(
            'let { foo: bar } = x; bar();',
            [{ path: ['x', 'foo'], normalizedPath: ['x', 'foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('traces renames in a non global scope', function () {
        const calls = findCalls(
            '(function () { const x = foo; x();}());',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo()']);
    });

    it('renames in a local scope doesn’t affect global scope', function () {
        const calls = findCalls(
            '(function () { const x = foo; }()); x();',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('renames in a local scope doesn’t affect a different local scope', function () {
        const calls = findCalls(
            '(function () { const x = foo; }()); (function () { x();}());',
            [{ path: ['foo'], normalizedPath: ['foo()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('remains the correct resolved path when assigning a nested property', function () {
        const calls = findCalls(
            'const x = foo.bar.baz; x();',
            [{ path: ['foo', 'bar', 'baz'], normalizedPath: ['foo', 'bar', 'baz()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['x()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz()']);
    });

    it('remains the correct resolved path when assigning a nested property and using deep destructuring', function () {
        const calls = findCalls(
            'const { a: { b: c } } = foo.bar.baz; c();',
            [{ path: ['foo', 'bar', 'baz', 'a', 'b'], normalizedPath: ['foo', 'bar', 'baz', 'a', 'b()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['c()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz', 'a', 'b()']);
    });

    it('traces multiple const renames in the same scope', function () {
        const calls = findCalls(
            'const { bar } = foo; const baz = bar; baz();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['baz()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
    });

    it('traces multiple const renames with multi-level member access per alias', function () {
        const calls = findCalls(
            'const { baz: qux } = foo.bar; const { quuux } = qux.quux; quuux();',
            [{ path: ['foo', 'bar', 'baz', 'quux', 'quuux'], normalizedPath: ['foo', 'bar', 'baz', 'quux', 'quuux()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['quuux()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz', 'quux', 'quuux()']);
    });

    it('doesn’t trace dynamic assignments', function () {
        const calls = findCalls(
            'const { bar } = foo; const baz = bar + 42; baz();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('traces multiple const renames with member access in the same scope', function () {
        const calls = findCalls(
            'const { bar } = foo; const baz = bar.baz; baz();',
            [{ path: ['foo', 'bar', 'baz'], normalizedPath: ['foo', 'bar', 'baz()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['baz()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz()']);
    });

    it('traces multiple const renames in different scopes', function () {
        const calls = findCalls(
            'const { bar } = foo; (function() {const baz = bar.baz; baz();}());',
            [{ path: ['foo', 'bar', 'baz'], normalizedPath: ['foo', 'bar', 'baz()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['baz()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz()']);
    });

    it('traces dynamic member expression calls as long as the resolve to a constant string', function () {
        const calls = findCalls(
            'const member = "bar"; foo[member]();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['foo', 'bar()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar()']);
    });

    it('doesn’t trace dynamic member expression calls when they can’t be resolved statically', function () {
        const calls = findCalls(
            'foo[externalMember]();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });

    it('traces resolvable dynamic member expression calls of aliases', function () {
        const calls = findCalls(
            'const member = "baz"; const { bar } = foo; bar[member]();',
            [{ path: ['foo', 'bar', 'baz'], normalizedPath: ['foo', 'bar', 'baz()'] }]
        );

        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(calls[0].path, ['bar', 'baz()']);
        assert.deepStrictEqual(calls[0].resolvedPath, ['foo', 'bar', 'baz()']);
    });

    it('doesn’t trace unresolvable dynamic member expression calls of aliases', function () {
        const calls = findCalls(
            'const { bar } = foo; bar[externalMember]();',
            [{ path: ['foo', 'bar'], normalizedPath: ['foo', 'bar()'] }]
        );

        assert.strictEqual(calls.length, 0);
    });
});
