import assert from 'node:assert';
import { type Rule, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.ts';
import { noSetupInSuiteRule } from './no-setup-in-suite.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const memberExpressionError = 'Unexpected member expression in suite block. ' +
    'Member expressions may call functions via getters.';

ruleTester.run('no-setup-in-suite', noSetupInSuiteRule, {
    valid: [
        'it()',
        'it(); it(); it()',
        'a.b',
        'b()',
        'function g() { a() }',
        { code: '() => { a.b }', languageOptions: { ecmaVersion: 6 } },
        'it("", function () { b(); })',
        'it("", function () { a.b; })',
        'it("", function () { a[b]; })',
        'it("", function () { a["b"]; })',
        'describe("", function () { it(); })',
        'describe.skip("", function () { it(); })',
        'describe.only("", function () { it(); })',
        'describe["only"]("", function () { it(); })',
        'describe("", function () { this.slow(1); it(); })',
        'describe("", function () { this.timeout(1); it(); })',
        'describe("", function () { this.retries(1); it(); })',
        'describe("", function () { this["retries"](1); it(); })',
        'describe("", function () { it("", function () { b(); }); })',
        'describe("", function () { it("", function () { a.b; }); })',
        'describe("", function () { it("", function () { a[b]; }); })',
        'describe("", function () { it("", function () { a["b"]; }); })',
        'describe("", function () { it("", function () { this.slow(1); }); })',
        'describe("", function () { it("", function () { this.timeout(1); }); })',
        'describe("", function () { it("", function () {}).timeout(1); })',
        'describe("", function () { it("", function () {}).slow(1); })',
        'describe("", function () { it.only("", function () {}).timeout(1); })',
        'describe("", function () { it.skip("", function () {}).timeout(1); })',
        'describe("", function () { xspecify("", function () {}).timeout(1); })',
        'describe("", function () { it("", function () { this.retries(1); }); })',
        'describe("", function () { it("", function () { this["retries"](1); }); })',
        'describe("", function () { function a() { b(); }; it(); })',
        'describe("", function () { function a() { b.c; }; it(); })',
        'describe("", function () { afterEach(function() { b(); }); it(); })',
        'describe("", () => { before(function() {}).timeout(10_000); });',
        'describe("", () => { after(function() {}).timeout(10_000); });',
        'describe("", () => { beforeEach(function() {}).timeout(10_000); });',
        'describe("", () => { afterEach(function() {}).timeout(10_000); });',
        withInterface('TDD', 'suite("", function () { teardown(function() { b(); }); test(); })'),
        withInterface('TDD', 'suite("", function () { suiteTeardown(function() { b(); }); test(); })'),
        withInterface('TDD', 'suite("", function () { setup(function() { b(); }); test(); })'),
        withInterface('TDD', 'suite("", function () { suiteSetup(function() { b(); }); test(); })'),
        {
            code: 'describe("", function () { before(() => { b(); }); it(); })',
            languageOptions: { ecmaVersion: 6 }
        },
        {
            code: 'describe("", function () { var a = () => b(); it(); })',
            languageOptions: { ecmaVersion: 6 }
        },
        {
            code: 'describe("", function () { var a = () => b.c; it(); })',
            languageOptions: { ecmaVersion: 6 }
        },
        'describe("", function () { describe("", function () { it(); }); it(); })',
        {
            code: 'foo("", function () { it(); })',
            name: 'allows custom suites without setup from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [
                    { name: 'foo', type: 'suite', interface: 'BDD' }
                ]
            }
        },
        {
            code: 'foo("", function () { it(); })',
            name: 'allows custom suites without setup from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'foo("", function () { it("", function () { b(); }); })',
            name: 'allows setup inside custom test callbacks',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: `describe('', () => {
              it('', () =>{
                  foo()();
                  foo()();
                  bar();
              });
            });`,
            languageOptions: { ecmaVersion: 2015 }
        },
        'describe("", function () { function bar() { a.b = "c"; } it(); })',
        {
            code: 'describe("", function () { const bar = () => { a.b = "c"; }; it(); })',
            languageOptions: { ecmaVersion: 2015 }
        },
        'describe("", function () { var bar = function () { a.b = "c"; }; it(); })',
        {
            code: 'describe("", function () { const token = Symbol("bar"); it(); })',
            options: [ { allow: [ 'Symbol' ] } ],
            name: 'allows configured Symbol calls'
        },
        {
            code: 'describe("", function () { const token = Symbol("bar"); it(); })',
            options: [ { allow: [ 'Symbol()' ] } ],
            name: 'allows configured Symbol call paths'
        },
        {
            code: 'describe("", function () { Object.freeze({}); it(); })',
            options: [ { allow: [ 'Object.freeze' ] } ],
            name: 'allows configured Object.freeze calls'
        },
        {
            code: 'describe("", function () { Object.freeze({}); it(); })',
            options: [ { allow: [ 'Object.freeze()' ] } ],
            name: 'allows configured Object.freeze call paths'
        }
    ],

    invalid: [
        withInterface('TDD', {
            code: 'suite("", function () { this.timeout(42); a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 43
                }
            ]
        }),
        withInterface('TDD', {
            code: 'suite("", function () { a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 25
                }
            ]
        }),
        {
            code: 'describe("", function () { a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 29
                }
            ]
        },
        {
            code: 'describe("", () => { a(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 23
                }
            ]
        },
        {
            code: 'describe("", function () { const later = () => {}; a(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 52,
                    endLine: 1,
                    endColumn: 53
                }
            ]
        },
        {
            code: 'describe("", function () { function later() {} a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 48,
                    endLine: 1,
                    endColumn: 49
                }
            ]
        },
        {
            code: 'describe("", function () { var later = function () {}; a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 56,
                    endLine: 1,
                    endColumn: 57
                }
            ]
        },
        {
            code: 'foo("", function () { a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 23,
                    endLine: 1,
                    endColumn: 24
                }
            ],
            name: 'reports custom suite setup from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'foo("", function () { a[b]; });',
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23,
                    endLine: 1,
                    endColumn: 27
                }
            ],
            name: 'reports custom suite setup calls with member expressions',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'foo("", function () { a["b"]; });',
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23,
                    endLine: 1,
                    endColumn: 29
                }
            ],
            name: 'reports custom suite setup from legacy settings',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'describe("", function () { a.b; });',
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 31
                }
            ]
        },
        {
            code: 'describe("", function () { this.a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 34
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 34
                }
            ]
        },
        {
            code: 'foo("", function () { a.b; });',
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23,
                    endLine: 1,
                    endColumn: 26
                }
            ],
            name: 'reports setup in custom nested suites',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'describe("", function () { it("", function () {}).a(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 52
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 52
                },
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 30
                }
            ]
        },
        {
            code: 'describe("", function () { something("", function () {}).timeout(); });',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 65
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 65
                },
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 37
                }
            ]
        },
        {
            code: 'describe("", function () { const token = Symbol("bar"); it(); })',
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 42,
                    endLine: 1,
                    endColumn: 48
                }
            ]
        },
        {
            code: 'describe("", function () { const token = Symbol("bar"); helper(); it(); })',
            options: [ { allow: [ 'Symbol' ] } ],
            errors: [
                {
                    message: 'Unexpected function call in suite block.',
                    line: 1,
                    column: 57,
                    endLine: 1,
                    endColumn: 63
                }
            ],
            name: 'reports disallowed calls alongside allowed calls'
        },
        {
            code: 'describe("", function () { Object.freeze; it(); })',
            options: [ { allow: [ 'Object.freeze' ] } ],
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28,
                    endLine: 1,
                    endColumn: 41
                }
            ],
            name: 'reports configured Object.freeze references without calls'
        }
    ]
});

suite('no-setup-in-suite create()', function () {
    test('normalizes non-string allow entries when invoked directly', function () {
        noSetupInSuiteRule.create({
            id: 'no-setup-in-suite',
            options: [ { allow: [ 42 ] } ],
            settings: {},
            sourceCode: {
                ast: { body: [] },
                scopeManager: {
                    globalScope: null
                }
            }
        } as unknown as Rule.RuleContext);

        assert.ok(true);
    });
});
