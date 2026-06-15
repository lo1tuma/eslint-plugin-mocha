import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.ts';
import { noExclusiveTestsRule } from './no-exclusive-tests.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const expectedErrorMessage = 'Unexpected exclusive mocha test.';

ruleTester.run('no-exclusive-tests', noExclusiveTestsRule, {
    valid: [
        'describe()',
        'it()',
        'describe.skip()',
        'it.skip()',
        withInterface('TDD', 'suite()'),
        withInterface('TDD', 'test()'),
        withInterface('TDD', 'suite.skip()'),
        withInterface('TDD', 'test.skip()'),
        'context()',
        'context.skip()',
        'var appliedOnly = describe.only; appliedOnly.apply(describe)',
        'var calledOnly = it.only; calledOnly.call(it)',
        withInterface('TDD', 'var dynamicOnly = "onl"; dynamicOnly += "y"; suite[dynamicOnly]()'),
        'function foo() { var it; it.only(); }',
        'specify()',
        'specify.skip()',
        {
            code: 'a.b.c.skip()',
            name: 'allows skipped custom member-expression tests',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'a.b.c', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'a[b].c.skip()',
            name: 'ignores dynamic custom member-expression paths',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'a.b.c', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'import { it} from "mocha"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'ignores mocha imports when require interface is not configured',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import { it as foo } from "mocha"; foo.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'ignores aliased mocha imports when require interface is not configured',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import { it } from "../helpers.js"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            name: 'ignores imports from non-mocha modules',
            settings: { mocha: { interface: 'require' } }
        }
    ],

    invalid: [
        {
            code: 'describe.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'describe()' } ],
                endLine: 1,
                endColumn: 14
            } ]
        },
        {
            code: 'describe["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 10,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'describe()' } ],
                endLine: 1,
                endColumn: 16
            } ]
        },
        {
            code: 'it.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'it()' } ],
                endLine: 1,
                endColumn: 8
            } ]
        },
        {
            code: 'import { it } from "mocha"; it.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ {
                message: expectedErrorMessage,
                column: 32,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'import { it } from "mocha"; it()' } ],
                endLine: 1,
                endColumn: 36
            } ],
            name: 'reports required imported exclusive tests',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'import { it as foo } from "mocha"; foo.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ {
                message: expectedErrorMessage,
                column: 40,
                line: 1,
                suggestions: [ {
                    messageId: 'removeExclusiveModifier',
                    output: 'import { it as foo } from "mocha"; foo()'
                } ],
                endLine: 1,
                endColumn: 44
            } ],
            name: 'reports required aliased exclusive tests',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'import { it as foo } from "mocha"; const bar = foo; bar.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ {
                message: expectedErrorMessage,
                column: 57,
                line: 1,
                suggestions: [
                    {
                        messageId: 'removeExclusiveModifier',
                        output: 'import { it as foo } from "mocha"; const bar = foo; bar()'
                    }
                ],
                endLine: 1,
                endColumn: 61
            } ],
            name: 'reports required exclusive tests through local aliases',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'it["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 4,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'it()' } ],
                endLine: 1,
                endColumn: 10
            } ]
        },
        withInterface('TDD', {
            code: 'suite.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'suite()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'suite["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'suite()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'test.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'test()' } ]
            } ]
        }),
        withInterface('TDD', {
            code: 'test["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 6,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'test()' } ]
            } ]
        }),
        {
            code: 'context.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'context()' } ],
                endLine: 1,
                endColumn: 13
            } ]
        },
        {
            code: 'context["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'context()' } ],
                endLine: 1,
                endColumn: 15
            } ]
        },
        {
            code: 'specify.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'specify()' } ],
                endLine: 1,
                endColumn: 13
            } ]
        },
        {
            code: 'specify["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'specify()' } ],
                endLine: 1,
                endColumn: 15
            } ]
        },
        {
            code: 'custom.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 12
            } ],
            name: 'reports custom exclusive calls from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'custom["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 14
            } ],
            name: 'reports computed custom exclusive calls from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
            }
        },
        {
            code: 'custom.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 12
            } ],
            name: 'reports custom exclusive calls from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'custom["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 8,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'custom()' } ],
                endLine: 1,
                endColumn: 14
            } ],
            name: 'reports computed custom exclusive calls from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'custom', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'foo.bar.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'foo.bar()' } ],
                endLine: 1,
                endColumn: 13
            } ],
            name: 'reports custom member-expression exclusive calls',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo.bar', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'foo.bar["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 9,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'foo.bar()' } ],
                endLine: 1,
                endColumn: 15
            } ],
            name: 'reports computed exclusive modifiers on custom member-expression calls',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo.bar', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'foo["bar"].only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 12,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'foo["bar"]()' } ],
                endLine: 1,
                endColumn: 16
            } ],
            name: 'reports custom member expressions with computed path segments',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo.bar', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'foo["bar"]["only"]()',
            errors: [ {
                message: expectedErrorMessage,
                column: 12,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'foo["bar"]()' } ],
                endLine: 1,
                endColumn: 18
            } ],
            name: 'reports custom member expressions with computed paths and modifiers',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo.bar', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'a.b.c.only()',
            errors: [ {
                message: expectedErrorMessage,
                column: 7,
                line: 1,
                suggestions: [ { messageId: 'removeExclusiveModifier', output: 'a.b.c()' } ],
                endLine: 1,
                endColumn: 11
            } ],
            name: 'reports deeply nested custom exclusive calls',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'a.b.c', type: 'testCase', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'import { custom } from "../helpers.js"; custom.only()',
            languageOptions: {
                ecmaVersion: 2018,
                sourceType: 'module'
            },
            errors: [ {
                message: expectedErrorMessage,
                column: 48,
                line: 1,
                suggestions: [ {
                    messageId: 'removeExclusiveModifier',
                    output: 'import { custom } from "../helpers.js"; custom()'
                } ],
                endLine: 1,
                endColumn: 52
            } ],
            name: 'reports imported custom exclusive tests from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'custom', type: 'testCase', interface: 'require' } ]
            }
        }
    ]
});
