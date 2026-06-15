import assert from 'node:assert';
import { RuleTester } from 'eslint';
import { suite, test } from 'mocha';
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
            options: [ allowSkippedWithCommentOption ],
            name: 'allows skipped tests with an adjacent line comment'
        },
        {
            code: 'something();\n// SKIP pending #201\nit.skip("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            name: 'allows skipped tests with a preceding line comment after code'
        },
        {
            code: '/* SKIP pending #201 */ xdescribe("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            name: 'allows skipped suites with an adjacent block comment'
        },
        withInterface('TDD', {
            code: '// SKIP pending #201\ntest.skip("works", function() {})',
            options: [ allowSkippedWithCommentOption ]
        }),
        {
            code: '// SKIP pending #201\nit("works", function() { this.skip(); })',
            options: [ allowSkippedWithCommentOption ],
            name: 'allows runtime test skips with an adjacent line comment'
        },
        {
            code: '// SKIP pending #201\nbefore(function() { this.skip(); })',
            options: [ allowSkippedWithCommentOption ],
            name: 'allows runtime hook skips with an adjacent line comment'
        },
        'it("works", function() { this.only(); })',
        'it("works", function() { this["only"](); })',
        'it("works", function() { function later() { this.skip(); } later.call(this); })',
        {
            code: 'xcustom()',
            name: 'ignores unmatched custom pending aliases',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'TDD' } ]
                }
            }
        },
        {
            code: '// SKIP pending #201\nxcustom()',
            options: [ allowSkippedWithCommentOption ],
            name: 'allows custom pending aliases from legacy settings with comments',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        }
    ],

    invalid: [
        {
            code: 'it("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 17 } ]
        },
        withInterface('TDD', {
            code: 'test("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1 } ]
        }),
        {
            code: 'specify("is pending")',
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 22 } ]
        },
        {
            code: 'describe.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'describe()' } ],
                endLine: 1,
                endColumn: 14
            } ]
        },
        {
            code: 'describe["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'describe()' } ],
                endLine: 1,
                endColumn: 16
            } ]
        },
        {
            code: 'xdescribe()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'describe()' } ],
                endLine: 1,
                endColumn: 10
            } ]
        },
        {
            code: 'it.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'it()' } ],
                endLine: 1,
                endColumn: 8
            } ]
        },
        {
            code: 'it["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'it()' } ],
                endLine: 1,
                endColumn: 10
            } ]
        },
        {
            code: 'xit()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'it()' } ],
                endLine: 1,
                endColumn: 4
            } ]
        },
        withInterface('TDD', {
            code: 'suite.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'suite()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'suite["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'suite()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'test.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'test()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'test["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'test()' } ]
            } ]
        }),
        {
            code: 'context.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'context()' } ],
                endLine: 1,
                endColumn: 13
            } ]
        },
        {
            code: 'context["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'context()' } ],
                endLine: 1,
                endColumn: 15
            } ]
        },
        {
            code: 'xcontext()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'context()' } ],
                endLine: 1,
                endColumn: 9
            } ]
        },
        {
            code: 'specify.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'specify()' } ],
                endLine: 1,
                endColumn: 13
            } ]
        },
        {
            code: 'xspecify()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'specify()' } ],
                endLine: 1,
                endColumn: 9
            } ]
        },
        {
            code: 'custom.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 12
            } ],
            name: 'reports custom pending aliases from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'custom["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 14
            } ],
            name: 'reports custom skipped aliases from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'xcustom()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 8
            } ],
            name: 'reports custom pending calls from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'custom.skip()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 12
            } ],
            name: 'reports custom pending aliases from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'custom["skip"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 14
            } ],
            name: 'reports custom skipped aliases from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'xcustom()',
            errors: [ {
                message: expectedErrorMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 8
            } ],
            name: 'reports custom pending calls from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'it("is pending")',
            options: [ allowSkippedWithCommentOption ],
            errors: [ { message: expectedErrorMessage, column: 1, line: 1, endLine: 1, endColumn: 17 } ],
            name: 'reports pending tests without accepted comments'
        },
        {
            code: 'xdescribe("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            errors: [ {
                message: expectedMissingCommentMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'describe("works", function() {})' } ],
                endLine: 1,
                endColumn: 10
            } ],
            name: 'reports skipped suites without accepted comments'
        },
        {
            code: 'it.skip("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            errors: [ {
                message: expectedMissingCommentMessage,
                column: 4,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'it("works", function() {})' } ],
                endLine: 1,
                endColumn: 8
            } ],
            name: 'reports skipped tests without accepted comments'
        },
        {
            code: '// SKIP pending #201\n\nit.skip("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            errors: [ {
                message: expectedMissingCommentMessage,
                column: 4,
                line: 3,
                suggestions: [ {
                    messageId: 'removePendingModifier',
                    output: '// SKIP pending #201\n\nit("works", function() {})'
                } ],
                endLine: 3,
                endColumn: 8
            } ],
            name: 'requires the accepted comment to be adjacent'
        },
        {
            code: 'something(); // SKIP pending #201\nit.skip("works", function() {})',
            options: [ allowSkippedWithCommentOption ],
            errors: [ {
                message: expectedMissingCommentMessage,
                column: 4,
                line: 2,
                suggestions: [ {
                    messageId: 'removePendingModifier',
                    output: 'something(); // SKIP pending #201\nit("works", function() {})'
                } ],
                endLine: 2,
                endColumn: 8
            } ],
            name: 'ignores accepted comments on unrelated statements'
        },
        {
            code: 'xcustom()',
            options: [ allowSkippedWithCommentOption ],
            errors: [ {
                message: expectedMissingCommentMessage,
                column: 1,
                line: 1,
                suggestions: [ { messageId: 'removePendingModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 8
            } ],
            name: 'reports custom pending aliases without accepted comments',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'it("works", function() { this.skip(); })',
            errors: [ { message: expectedErrorMessage, column: 31, line: 1, endLine: 1, endColumn: 35 } ]
        },
        {
            code: 'before(function() { this.skip(); })',
            errors: [ { message: expectedErrorMessage, column: 26, line: 1, endLine: 1, endColumn: 30 } ]
        },
        {
            code: 'it("works", function() { (() => this.skip())(); })',
            errors: [ { message: expectedErrorMessage, column: 38, line: 1, endLine: 1, endColumn: 42 } ]
        },
        {
            code: 'it("works", function() { this.skip(); })',
            options: [ allowSkippedWithCommentOption ],
            errors: [ { message: expectedMissingCommentMessage, column: 31, line: 1, endLine: 1, endColumn: 35 } ],
            name: 'requires accepted comments for runtime test skips'
        },
        withInterface('TDD', {
            code: 'var dynamicOnly = "skip"; suite[dynamicOnly]()',
            errors: [ { message: expectedErrorMessage, column: 33, line: 1 } ]
        })
    ]
});

suite('no-pending-tests metadata', function () {
    test('defaults to disallowing skipped tests with comments', function () {
        assert.deepStrictEqual(noPendingTestsRule.meta?.defaultOptions, [ { allowSkippedWithComment: false } ]);
    });
});
