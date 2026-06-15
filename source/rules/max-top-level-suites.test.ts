import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { maxTopLevelSuitesRule } from './max-top-level-suites.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('max-top-level-suites', maxTopLevelSuitesRule, {
    valid: [
        'describe("This is a test", function () { });',
        'context("This is a test", function () { });',
        withInterface('TDD', {
            code: 'suite("This is a test", function () { });'
        }),
        'describe("This is a test", function () { describe("This is a different test", function () { }) });',
        'context("This is a test", function () { context("This is a different test", function () { }) });',
        withInterface('TDD', {
            code: 'suite("This is a test", function () { suite("This is a different test", function () { }) });'
        }),
        {
            code: 'describe("This is a test", function () { });',
            options: [ { limit: 2 } ],
            name: 'allows top-level suites below the configured limit'
        },
        {
            code: 'someOtherFunction();',
            options: [ { limit: 1 } ],
            name: 'ignores non-suite calls with a positive limit'
        },
        {
            code: 'someOtherFunction();',
            options: [ { limit: 0 } ],
            name: 'ignores non-suite calls with a zero limit'
        },
        {
            code: 'someOtherFunction();',
            options: [ {} ],
            name: 'ignores non-suite calls with default options'
        },
        {
            code: 'foo("This is a test", function () { });',
            name: 'allows custom suites from legacy settings below the limit',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: 'foo("This is a test", function () { });',
            name: 'allows custom suites from nested settings below the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        'someOtherFunction();',
        'describe("top", function () {}); function foo() { describe("not necessarily top", function () {}); }',
        {
            code: 'describe("", function () { });',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            }
        },
        {
            code: 'describe("", function () { describe("", function () {}); });',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            }
        },
        {
            code: [
                'describe.foo("", function () {',
                '    describe("", function () {});',
                '    describe("", function () {});',
                '});'
            ]
                .join('\n'),
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            },
            name: 'allows imported custom member-expression suites below the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'describe.foo("bar")("", function () {',
                '    describe("", function () {});',
                '    describe("", function () {});',
                '});'
            ]
                .join('\n'),
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            },
            name: 'allows imported custom chained suites below the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo()', type: 'suite', interface: 'BDD' } ]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 45,
                    endLine: 1,
                    endColumn: 98
                }
            ]
        },
        {
            code: 'describe("", function () { });' +
                'describe("", function () { });',
            languageOptions: {
                sourceType: 'module',
                ecmaVersion: 2015
            },
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 31,
                    endLine: 1,
                    endColumn: 60
                }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });' +
                'describe("this is an another different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 45,
                    endLine: 1,
                    endColumn: 98
                }
            ]
        },
        {
            code: 'context("this is a test", function () { });' +
                'context("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 44,
                    endLine: 1,
                    endColumn: 96
                }
            ]
        },
        withInterface('TDD', {
            code: 'suite("this is a test", function () { });' +
                'suite("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        }),
        {
            code: 'describe("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 46,
                    endLine: 1,
                    endColumn: 88
                }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                'someOtherFunction();' +
                'describe("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 65,
                    endLine: 1,
                    endColumn: 118
                }
            ]
        },
        {
            code: 'someOtherFunction();' +
                'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 65,
                    endLine: 1,
                    endColumn: 118
                }
            ]
        },
        {
            code: 'describe.skip("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });' +
                'describe("this is a whole different test", function () { });',
            options: [ { limit: 2 } ],
            errors: [
                {
                    message: 'The number of top-level suites is more than 2.',
                    line: 1,
                    column: 109,
                    endLine: 1,
                    endColumn: 168
                }
            ],
            name: 'reports BDD suites above the configured limit'
        },
        {
            code: 'xdescribe("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });' +
                'describe("this is a whole different test", function () { });',
            options: [ { limit: 1 } ],
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 46,
                    endLine: 1,
                    endColumn: 104
                }
            ],
            name: 'reports exclusive and pending BDD suites above the limit'
        },
        withInterface('TDD', {
            options: [ { limit: 2 } ],
            code: 'suite.skip("this is a test", function () { });' +
                'suite.only("this is a different test", function () { });' +
                'suite("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        }),
        {
            code: 'context.skip("this is a test", function () { });' +
                'context.only("this is a different test", function () { });' +
                'context("this is a whole different test", function () { });',
            options: [ { limit: 2 } ],
            errors: [
                {
                    message: 'The number of top-level suites is more than 2.',
                    line: 1,
                    column: 107,
                    endLine: 1,
                    endColumn: 165
                }
            ],
            name: 'reports TDD suites above the configured limit'
        },
        {
            code: 'describe("this is a test", function () { });',
            options: [ { limit: 0 } ],
            errors: [
                {
                    message: 'The number of top-level suites is more than 0.',
                    line: 1,
                    column: 1,
                    endLine: 1,
                    endColumn: 44
                }
            ],
            name: 'reports suites when the configured limit is zero'
        },
        {
            code: 'describe("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });',
            options: [ {} ],
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 45,
                    endLine: 1,
                    endColumn: 103
                }
            ],
            name: 'reports suites above the default limit'
        },
        {
            code: 'foo("this is a test", function () { });' +
                'foo("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 40,
                    endLine: 1,
                    endColumn: 88
                }
            ],
            name: 'reports custom suites from legacy settings above the limit',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: 'foo("this is a test", function () { });' +
                'foo("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 40,
                    endLine: 1,
                    endColumn: 88
                }
            ],
            name: 'reports custom suites from nested settings above the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: 'describe.foo("bar")("this is a test", function () { });' +
                'context.foo("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 56,
                    endLine: 1,
                    endColumn: 112
                }
            ],
            name: 'reports mixed custom member-expression suites above the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'describe.foo()', type: 'suite', interface: 'BDD' },
                        { name: 'context.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        {
            code: 'forEach([ 1, 2, 3 ]).describe("this is a test", function () { });' +
                'context.foo("this is a different test", function () { });',
            errors: [
                {
                    message: 'The number of top-level suites is more than 1.',
                    line: 1,
                    column: 66,
                    endLine: 1,
                    endColumn: 122
                }
            ],
            name: 'reports mixed custom chained suites above the limit',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe', type: 'suite', interface: 'BDD' },
                        { name: 'context.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        }
    ]
});
