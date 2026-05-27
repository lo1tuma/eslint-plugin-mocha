import { RuleTester } from 'eslint';
import assert from 'node:assert';
import { withInterface } from '../mocha-interface-test-cases.js';
import { noPendingTestsRule } from './no-pending-tests.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected pending mocha test.';
const expectedMissingCommentMessage = 'Unexpected skipped mocha test without a preceding comment.';
const allowSkippedWithCommentOption = { allowSkippedWithComment: true };

ruleTester.run('no-pending-tests', noPendingTestsRule, {
    valid: [
        'it()',
        'it("should be false", function() { assert(something, false); })',
        withInterface('TDD', 'test()'),
        withInterface('TDD', 'test("should be false", function() { assert(something, false); })'),
        'specify()',
        'specify("should be false", function() { assert(something, false); })',
        'something.it()',
        'something.it("test")',
        'it(title)',
        'describe()',
        'describe.only()',
        'it["only"]()',
        'it.only()',
        withInterface('TDD', 'suite()'),
        withInterface('TDD', 'suite.only()'),
        withInterface('TDD', 'test.only()'),
        'context()',
        'context.only()',
        'var appliedOnly = describe.skip; appliedOnly.apply(describe)',
        'var calledOnly = it.skip; calledOnly.call(it)',
        withInterface('TDD', 'var dynamicOnly = "ski"; dynamicOnly += String.fromCharCode(112); suite[dynamicOnly]()'),
        {
            code: '// SKIP pending #201\nit.skip("works", function() {})',
            options: [allowSkippedWithCommentOption]
        },
        {
            code: 'something();\n// SKIP pending #201\nit.skip("works", function() {})',
            options: [allowSkippedWithCommentOption]
        },
        {
            code: '/* SKIP pending #201 */ xdescribe("works", function() {})',
            options: [allowSkippedWithCommentOption]
        },
        withInterface('TDD', {
            code: '// SKIP pending #201\ntest.skip("works", function() {})',
            options: [allowSkippedWithCommentOption]
        }),
        {
            code: '// SKIP pending #201\nit("works", function() { this.skip(); })',
            options: [allowSkippedWithCommentOption]
        },
        {
            code: '// SKIP pending #201\nbefore(function() { this.skip(); })',
            options: [allowSkippedWithCommentOption]
        },
        'it("works", function() { this.only(); })',
        'it("works", function() { this["only"](); })',
        'it("works", function() { function later() { this.skip(); } later.call(this); })',
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'TDD' }]
                }
            }
        },
        {
            code: '// SKIP pending #201\nxcustom()',
            options: [allowSkippedWithCommentOption],
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            }
        }
    ],

    invalid: [
        {
            code: 'it("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        withInterface('TDD', {
            code: 'test("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        }),
        {
            code: 'specify("is pending")',
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'describe.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'describe()' }]
            }]
        },
        {
            code: 'describe["skip"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'describe()' }]
            }]
        },
        {
            code: 'xdescribe()',
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'describe()' }]
            }]
        },
        {
            code: 'it.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'it()' }]
            }]
        },
        {
            code: 'it["skip"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'it()' }]
            }]
        },
        {
            code: 'xit()',
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'it()' }]
            }]
        },
        withInterface('TDD', {
            code: 'suite.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'suite()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'suite["skip"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'suite()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'test.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'test()' }]
            }]
        }),
        withInterface('TDD', {
            code: 'test["skip"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'test()' }]
            }]
        }),
        {
            code: 'context.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'context()' }]
            }]
        },
        {
            code: 'context["skip"]()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'context()' }]
            }]
        },
        {
            code: 'xcontext()',
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'context()' }]
            }]
        },
        {
            code: 'specify.skip()',
            errors: [{
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'specify()' }]
            }]
        },
        {
            code: 'xspecify()',
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'specify()' }]
            }]
        },
        {
            code: 'custom.skip()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'xcustom()',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom.skip()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'custom["skip"]()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'xcustom()',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
                }
            },
            errors: [{
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'it("is pending")',
            options: [allowSkippedWithCommentOption],
            errors: [{ message: expectedErrorMessage, column: 1, line: 1 }]
        },
        {
            code: 'xdescribe("works", function() {})',
            options: [allowSkippedWithCommentOption],
            errors: [{
                message: expectedMissingCommentMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'describe("works", function() {})' }]
            }]
        },
        {
            code: 'it.skip("works", function() {})',
            options: [allowSkippedWithCommentOption],
            errors: [{
                message: expectedMissingCommentMessage,
                column: 4,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'it("works", function() {})' }]
            }]
        },
        {
            code: '// SKIP pending #201\n\nit.skip("works", function() {})',
            options: [allowSkippedWithCommentOption],
            errors: [{
                message: expectedMissingCommentMessage,
                column: 4,
                line: 3,
                suggestions: [{
                    messageId: 'removePendingModifier',
                    output: '// SKIP pending #201\n\nit("works", function() {})'
                }]
            }]
        },
        {
            code: 'something(); // SKIP pending #201\nit.skip("works", function() {})',
            options: [allowSkippedWithCommentOption],
            errors: [{
                message: expectedMissingCommentMessage,
                column: 4,
                line: 2,
                suggestions: [{
                    messageId: 'removePendingModifier',
                    output: 'something(); // SKIP pending #201\nit("works", function() {})'
                }]
            }]
        },
        {
            code: 'xcustom()',
            options: [allowSkippedWithCommentOption],
            settings: {
                'mocha/additionalCustomNames': [{ name: 'custom', type: 'testCase', interface: 'BDD' }]
            },
            errors: [{
                message: expectedMissingCommentMessage,
                column: 1,
                line: 1,
                suggestions: [{ messageId: 'removePendingModifier', output: 'custom()' }]
            }]
        },
        {
            code: 'it("works", function() { this.skip(); })',
            errors: [{ message: expectedErrorMessage, column: 31, line: 1 }]
        },
        {
            code: 'before(function() { this.skip(); })',
            errors: [{ message: expectedErrorMessage, column: 26, line: 1 }]
        },
        {
            code: 'it("works", function() { (() => this.skip())(); })',
            errors: [{ message: expectedErrorMessage, column: 38, line: 1 }]
        },
        {
            code: 'it("works", function() { this.skip(); })',
            options: [allowSkippedWithCommentOption],
            errors: [{ message: expectedMissingCommentMessage, column: 31, line: 1 }]
        },
        withInterface('TDD', {
            code: 'var dynamicOnly = "skip"; suite[dynamicOnly]()',
            errors: [{ message: expectedErrorMessage, column: 33, line: 1 }]
        })
    ]
});

describe('no-pending-tests metadata', function () {
    it('defaults to disallowing skipped tests with comments', function () {
        assert.deepStrictEqual(noPendingTestsRule.meta?.defaultOptions, [{ allowSkippedWithComment: false }]);
    });
});
