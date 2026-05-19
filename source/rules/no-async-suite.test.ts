import { type Rule, RuleTester, type SourceCode } from 'eslint';
import assert from 'node:assert';
import type { AnyFunction } from '../ast/node-types.js';
import { containsDirectAwait, fixAsyncFunction, noAsyncSuiteRule } from './no-async-suite.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

function asSourceCode(sourceCode: Record<string, unknown>): SourceCode {
    return sourceCode as SourceCode;
}

function asRuleFixer(fixer: Record<string, unknown>): Rule.RuleFixer {
    return fixer as Rule.RuleFixer;
}

function asRuleFix(fix: Record<string, unknown>): Rule.Fix {
    return fix as Rule.Fix;
}

function asAnyFunction(node: Record<string, unknown>): AnyFunction {
    return node as AnyFunction;
}

ruleTester.run('no-async-suite', noAsyncSuiteRule, {
    valid: [
        'describe()',
        'describe("hello")',
        'describe(function () {})',
        'describe("hello", function () {})',
        { code: '() => { a.b }', languageOptions: { ecmaVersion: 6 } },
        { code: 'describe("hello", () => { a.b })', languageOptions: { ecmaVersion: 6 } },
        'it()',
        { code: 'it("hello", async function () {})', languageOptions: { ecmaVersion: 8 } },
        { code: 'it("hello", async () => {})', languageOptions: { ecmaVersion: 8 } }
    ],

    invalid: [
        {
            code: 'describe("hello", async function () {})',
            output: 'describe("hello", function () {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            }]
        },
        {
            code: 'foo("hello", async function () {})',
            output: 'foo("hello", function () {})',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in foo()',
                line: 1,
                column: 14
            }]
        },
        {
            code: 'describe("hello", async () => {})',
            output: 'describe("hello", () => {})',
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            }]
        },
        {
            code: 'describe("hello", async () => foo)',
            output: 'describe("hello", () => foo)',
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            }]
        },
        {
            code: 'describe("hello", async () => {await foo;})',
            // Do not offer a fix for an async function that contains await
            output: null,
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            }]
        },
        {
            code: 'describe("hello", async () => {async function bar() {await foo;}})',
            // Do offer a fix despite a nested async function containing await
            output: 'describe("hello", () => {async function bar() {await foo;}})',
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe()',
                line: 1,
                column: 19
            }]
        },
        {
            code: 'describe.foo("bar")("hello", async () => {})',
            output: 'describe.foo("bar")("hello", () => {})',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'describe.foo()', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in describe.foo()()',
                line: 1,
                column: 30
            }]
        },
        {
            code: 'forEach([ 1, 2, 3 ]).describe.foo("hello", async () => {})',
            output: 'forEach([ 1, 2, 3 ]).describe.foo("hello", () => {})',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            languageOptions: { ecmaVersion: 8 },
            errors: [{
                message: 'Unexpected async function in forEach().describe.foo()',
                line: 1,
                column: 44
            }]
        }
    ]
});

describe('no-async-suite helpers', function () {
    it('containsDirectAwait() returns false for non-await expressions', function () {
        const result = containsDirectAwait({ type: 'Identifier' } as never);

        assert.strictEqual(result, false);
    });

    it('fixAsyncFunction() returns null when the async token cannot be resolved', function () {
        const sourceCode = asSourceCode({
            getFirstTokens() {
                return [];
            }
        });
        const fixer = asRuleFixer({
            removeRange() {
                return asRuleFix({});
            }
        });
        const node = asAnyFunction({
            body: { type: 'Identifier' }
        });
        const result = fixAsyncFunction(sourceCode, fixer, node);

        assert.strictEqual(result, null);
    });
});
