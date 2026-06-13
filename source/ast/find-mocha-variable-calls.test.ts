import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import { suite, test } from 'mocha';
import type { NameDetails } from '../mocha/name-details.js';
import { findMochaVariableCalls } from './find-mocha-variable-calls.js';

type ResolvedReferenceWithNameDetails = ReturnType<typeof findMochaVariableCalls>[number];
type FindCallsOptions = {
    readonly globals?: Readonly<Record<string, boolean | 'readonly' | 'writable'>>;
    readonly interfaceToUse?: 'BDD' | 'require' | 'TDD';
    readonly sourceType?: 'module' | 'script';
};

function getCall(
    calls: readonly ResolvedReferenceWithNameDetails[],
    index: number
): ResolvedReferenceWithNameDetails {
    const call = calls[index];

    if (call === undefined) {
        throw new Error('Expected call to exist.');
    }
    return call;
}

function findCalls(
    code: string,
    names: readonly Partial<NameDetails>[],
    {
        globals = {},
        interfaceToUse = 'BDD',
        sourceType = 'script'
    }: FindCallsOptions = {}
): readonly ResolvedReferenceWithNameDetails[] {
    const linter = new Linter();
    let calls: readonly ResolvedReferenceWithNameDetails[] = [];

    const testLintRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                'Program:exit'() {
                    calls = findMochaVariableCalls(
                        ruleContext,
                        names as (readonly NameDetails[]),
                        interfaceToUse,
                        false
                    );
                }
            };
        }
    };

    const results = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testLintRule } } },
        languageOptions: { ecmaVersion: 2018, sourceType, globals },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return calls;
}

suite('findMochaVariableCalls()', function () {
    suite('cases 1', function () {
        test('returns an empty array if no match was found', function () {
            const calls = findCalls(
                'bar()',
                [ { path: [ 'foo' ] } ]
            );

            assert.deepStrictEqual(calls, []);
        });

        test('returns an empty array if a matched identifier was found but it was not a CallExpression', function () {
            const calls = findCalls(
                'foo;',
                [ { path: [ 'foo' ] } ]
            );

            assert.deepStrictEqual(calls, []);
        });

        test('returns an empty array if a matched identifier was found but it it refers to a local definition', function () {
            const calls = findCalls(
                'var foo;',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.deepStrictEqual(calls, []);
        });

        test('finds a matching call when there is no resolved globals', function () {
            const calls = findCalls(
                'foo()',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()' ]);
        });

        test('finds a matching call when there is a resolved global', function () {
            const calls = findCalls(
                'foo()',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ],
                { globals: { foo: false } }
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()' ]);
        });

        test('does not treat require-interface custom names as globals', function () {
            const calls = findCalls(
                'foo()',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ], interface: 'require' } ],
                { globals: { foo: false } }
            );

            assert.deepStrictEqual(calls, []);
        });

        test('finds require-interface custom names via imports', function () {
            const calls = findCalls(
                'import { foo } from "bar"; foo();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ], interface: 'require' } ],
                { interfaceToUse: 'require', sourceType: 'module' }
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()' ]);
        });

        test('does not treat global-interface custom names as require imports', function () {
            const calls = findCalls(
                'import { foo } from "bar"; foo();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ], interface: 'BDD' } ],
                { interfaceToUse: 'require', sourceType: 'module' }
            );

            assert.deepStrictEqual(calls, []);
        });
    });

    suite('cases 2', function () {
        test('finds a matching call when there searching for a path', function () {
            const calls = findCalls(
                'foo.bar()',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ],
                { globals: { foo: false } }
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo', 'bar()' ]);
        });

        test('doesn’t find something when looking for a path but the searched path was not used', function () {
            const calls = findCalls(
                'foo()',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ],
                { globals: { foo: false } }
            );

            assert.strictEqual(calls.length, 0);
        });

        test('finds multiple matching calls', function () {
            const calls = findCalls(
                'foo(); foo();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 2);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()' ]);
            assert.deepStrictEqual(getCall(calls, 1).path, [ 'foo()' ]);
        });

        test('finds multiple matching calls of different names', function () {
            const calls = findCalls(
                'foo(); bar();',
                [
                    { path: [ 'foo' ], normalizedPath: [ 'foo()' ] },
                    { path: [ 'bar' ], normalizedPath: [ 'bar()' ] }
                ]
            );

            assert.strictEqual(calls.length, 2);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo()' ]);
            assert.deepStrictEqual(getCall(calls, 1).path, [ 'bar()' ]);
        });

        test('finds multiple matching calls with property access', function () {
            const calls = findCalls(
                'foo.x(); bar.x();',
                [
                    { path: [ 'foo', 'x' ], normalizedPath: [ 'foo', 'x()' ] },
                    { path: [ 'bar', 'x' ], normalizedPath: [ 'bar', 'x()' ] }
                ]
            );

            assert.strictEqual(calls.length, 2);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo', 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 1).path, [ 'bar', 'x()' ]);
        });

        test('extracts the correct path of a member expression', function () {
            const calls = findCalls(
                'foo.bar()',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo', 'bar()' ]);
        });

        test('extracts the correct path of a computed member expression', function () {
            const calls = findCalls(
                'foo["bar"]()',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo', 'bar()' ]);
        });

        test('traces function calls renames via const variable declaration const x = foo; x()', function () {
            const calls = findCalls(
                'const x = foo; x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()' ]);
        });
    });

    suite('cases 3', function () {
        test('traces renames via const variable declaration const y = bar, x = foo; x()', function () {
            const calls = findCalls(
                'const x = foo; x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()' ]);
        });

        test('doesn’t trace renames via assignments x = foo; x()', function () {
            const calls = findCalls(
                'x = foo; x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('doesn’t trace renames via properties x = { bar: foo }; x.bar()', function () {
            const calls = findCalls(
                'const x = { bar: foo }; x.bar();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('doesn’t trace renames via var declarations var x = foo; x()', function () {
            const calls = findCalls(
                'var x = foo; x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('doesn’t trace renames via let declarations let x = foo; x()', function () {
            const calls = findCalls(
                'let x = foo; x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('traces renames via const member assignment const x = foo.bar; x()', function () {
            const calls = findCalls(
                'const x = foo.bar; x();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
        });

        test('traces property calls of renames const declaration const x = foo; x.bar()', function () {
            const calls = findCalls(
                'const x = foo; x.bar();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x', 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
        });

        test('traces renames via const destructuring const { bar } = foo; bar()', function () {
            const calls = findCalls(
                'const { bar } = foo; bar();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
        });
    });

    suite('cases 4', function () {
        test('traces multiple renames via a single const destructuring const { bar,baz } = foo; bar();baz();', function () {
            const calls = findCalls(
                'const { bar, baz } = foo; bar(); baz();',
                [
                    { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] },
                    { path: [ 'foo', 'baz' ], normalizedPath: [ 'foo', 'baz()' ] }
                ]
            );

            assert.strictEqual(calls.length, 2);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 1).path, [ 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 1).resolvedPath, [ 'foo', 'baz()' ]);
        });

        test('traces renames via const destructuring alias const { foo: bar } = x; bar()', function () {
            const calls = findCalls(
                'const { foo: bar } = x; bar();',
                [ { path: [ 'x', 'foo' ], normalizedPath: [ 'x', 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'x', 'foo()' ]);
        });

        test('traces renames via nested const destructuring const { foo: { bar: baz} } = x; baz()', function () {
            const calls = findCalls(
                'const { foo: { bar: baz } } = x; baz();',
                [ { path: [ 'x', 'foo', 'bar' ], normalizedPath: [ 'x', 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'x', 'foo', 'bar()' ]);
        });

        test('doesn’t traces renames via var destructuring var { foo: bar } = x; bar()', function () {
            const calls = findCalls(
                'var { foo: bar } = x; bar();',
                [ { path: [ 'x', 'foo' ], normalizedPath: [ 'x', 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('doesn’t trace renames via let destructuring let { foo: bar } = x; bar()', function () {
            const calls = findCalls(
                'let { foo: bar } = x; bar();',
                [ { path: [ 'x', 'foo' ], normalizedPath: [ 'x', 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('traces renames in a non global scope', function () {
            const calls = findCalls(
                '(function () { const x = foo; x();}());',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo()' ]);
        });

        test('renames in a local scope doesn’t affect global scope', function () {
            const calls = findCalls(
                '(function () { const x = foo; }()); x();',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('renames in a local scope doesn’t affect a different local scope', function () {
            const calls = findCalls(
                '(function () { const x = foo; }()); (function () { x();}());',
                [ { path: [ 'foo' ], normalizedPath: [ 'foo()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });
    });

    suite('cases 5', function () {
        test('remains the correct resolved path when assigning a nested property', function () {
            const calls = findCalls(
                'const x = foo.bar.baz; x();',
                [ { path: [ 'foo', 'bar', 'baz' ], normalizedPath: [ 'foo', 'bar', 'baz()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'x()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz()' ]);
        });

        test('remains the correct resolved path when assigning a nested property and using deep destructuring', function () {
            const calls = findCalls(
                'const { a: { b: c } } = foo.bar.baz; c();',
                [ { path: [ 'foo', 'bar', 'baz', 'a', 'b' ], normalizedPath: [ 'foo', 'bar', 'baz', 'a', 'b()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'c()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz', 'a', 'b()' ]);
        });

        test('traces multiple const renames in the same scope', function () {
            const calls = findCalls(
                'const { bar } = foo; const baz = bar; baz();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
        });

        test('traces multiple const renames with multi-level member access per alias', function () {
            const calls = findCalls(
                'const { baz: qux } = foo.bar; const { quuux } = qux.quux; quuux();',
                [ {
                    path: [ 'foo', 'bar', 'baz', 'quux', 'quuux' ],
                    normalizedPath: [ 'foo', 'bar', 'baz', 'quux', 'quuux()' ]
                } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'quuux()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz', 'quux', 'quuux()' ]);
        });

        test('doesn’t trace dynamic assignments', function () {
            const calls = findCalls(
                'const { bar } = foo; const baz = bar + 42; baz();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('traces multiple const renames with member access in the same scope', function () {
            const calls = findCalls(
                'const { bar } = foo; const baz = bar.baz; baz();',
                [ { path: [ 'foo', 'bar', 'baz' ], normalizedPath: [ 'foo', 'bar', 'baz()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz()' ]);
        });

        test('traces multiple const renames in different scopes', function () {
            const calls = findCalls(
                'const { bar } = foo; (function() {const baz = bar.baz; baz();}());',
                [ { path: [ 'foo', 'bar', 'baz' ], normalizedPath: [ 'foo', 'bar', 'baz()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz()' ]);
        });

        test('traces dynamic member expression calls as long as the resolve to a constant string', function () {
            const calls = findCalls(
                'const member = "bar"; foo[member]();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'foo', 'bar()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar()' ]);
        });
    });

    suite('cases 6', function () {
        test('doesn’t trace dynamic member expression calls when they can’t be resolved statically', function () {
            const calls = findCalls(
                'foo[externalMember]();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });

        test('traces resolvable dynamic member expression calls of aliases', function () {
            const calls = findCalls(
                'const member = "baz"; const { bar } = foo; bar[member]();',
                [ { path: [ 'foo', 'bar', 'baz' ], normalizedPath: [ 'foo', 'bar', 'baz()' ] } ]
            );

            assert.strictEqual(calls.length, 1);
            assert.deepStrictEqual(getCall(calls, 0).path, [ 'bar', 'baz()' ]);
            assert.deepStrictEqual(getCall(calls, 0).resolvedPath, [ 'foo', 'bar', 'baz()' ]);
        });

        test('doesn’t trace unresolvable dynamic member expression calls of aliases', function () {
            const calls = findCalls(
                'const { bar } = foo; bar[externalMember]();',
                [ { path: [ 'foo', 'bar' ], normalizedPath: [ 'foo', 'bar()' ] } ]
            );

            assert.strictEqual(calls.length, 0);
        });
    });
});
