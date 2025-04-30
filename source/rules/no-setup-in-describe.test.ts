import { RuleTester } from 'eslint';
import { noSetupInDescribeRule } from './no-setup-in-describe.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const memberExpressionError = 'Unexpected member expression in describe block. ' +
    'Member expressions may call functions via getters.';

ruleTester.run('no-setup-in-describe', noSetupInDescribeRule, {
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
        { code: 'describe("", function () { this.slow(1); it(); })' },
        'describe("", function () { this.timeout(1); it(); })',
        'describe("", function () { this.retries(1); it(); })',
        'describe("", function () { this["retries"](1); it(); })',
        'describe("", function () { it("", function () { b(); }); })',
        'describe("", function () { it("", function () { a.b; }); })',
        'describe("", function () { it("", function () { a[b]; }); })',
        'describe("", function () { it("", function () { a["b"]; }); })',
        'describe("", function () { it("", function () { this.slow(1); }); })',
        'describe("", function () { it("", function () { this.timeout(1); }); })',
        { code: 'describe("", function () { it("", function () {}).timeout(1); })' },
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
        'suite("", function () { teardown(function() { b(); }); test(); })',
        'suite("", function () { suiteTeardown(function() { b(); }); test(); })',
        'suite("", function () { setup(function() { b(); }); test(); })',
        'suite("", function () { suiteSetup(function() { b(); }); test(); })',
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
            settings: {
                'mocha/additionalCustomNames': [
                    { name: 'foo', type: 'suite', interface: 'BDD' }
                ]
            }
        },
        {
            code: 'foo("", function () { it(); })',
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
        'describe("", function () { var bar = function () { a.b = "c"; }; it(); })'
    ],

    invalid: [
        {
            code: 'suite("", function () { a(); });',
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 25
                }
            ]
        },
        {
            code: 'describe("", function () { a(); });',
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                }
            ]
        },
        {
            code: 'describe("", () => { a(); });',
            languageOptions: { ecmaVersion: 2015 },
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 22
                }
            ]
        },
        {
            code: 'foo("", function () { a(); });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 23
                }
            ]
        },
        {
            code: 'foo("", function () { a[b]; });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23
                }
            ]
        },
        {
            code: 'foo("", function () { a["b"]; });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23
                }
            ]
        },
        {
            code: 'describe("", function () { a.b; });',
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28
                }
            ]
        },
        {
            code: 'describe("", function () { this.a(); });',
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28
                }
            ]
        },
        {
            code: 'foo("", function () { a.b; });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 23
                }
            ]
        },
        {
            code: 'describe("", function () { it("", function () {}).a(); });',
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28
                },
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                }
            ]
        },
        {
            code: 'describe("", function () { something("", function () {}).timeout(); });',
            errors: [
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                },
                {
                    message: memberExpressionError,
                    line: 1,
                    column: 28
                },
                {
                    message: 'Unexpected function call in describe block.',
                    line: 1,
                    column: 28
                }
            ]
        }
    ]
});
