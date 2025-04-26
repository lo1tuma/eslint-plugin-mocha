import { RuleTester } from 'eslint';
import { maxTopLevelSuitesRule } from './max-top-level-suites.js';
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('max-top-level-suites', maxTopLevelSuitesRule, {
    valid: [
        {
            code: 'describe("This is a test", function () { });'
        },
        {
            code: 'context("This is a test", function () { });'
        },
        {
            code: 'suite("This is a test", function () { });'
        },
        {
            code: 'describe("This is a test", function () { describe("This is a different test", function () { }) });'
        },
        {
            code: 'context("This is a test", function () { context("This is a different test", function () { }) });'
        },
        {
            code: 'suite("This is a test", function () { suite("This is a different test", function () { }) });'
        },
        {
            options: [{ limit: 2 }],
            code: 'describe("This is a test", function () { });'
        },
        {
            options: [{ limit: 1 }],
            code: 'someOtherFunction();'
        },
        {
            options: [{ limit: 0 }],
            code: 'someOtherFunction();'
        },
        {
            options: [{}],
            code: 'someOtherFunction();'
        },
        {
            code: 'foo("This is a test", function () { });',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            }
        },
        {
            code: 'foo("This is a test", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo', type: 'suite', interface: 'BDD' }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo()', type: 'suite', interface: 'BDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
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
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });' +
                'describe("this is an another different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'context("this is a test", function () { });' +
                'context("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { });' +
                'suite("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'suite("this is a test", function () { }); context("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe("this is a test", function () { });' +
                'someOtherFunction();' +
                'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'someOtherFunction();' +
                'describe("this is a test", function () { });' +
                'describe("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            options: [{ limit: 2 }],
            code: 'describe.skip("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });' +
                'describe("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [{ limit: 1 }],
            code: 'xdescribe("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });' +
                'describe("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            options: [{ limit: 2 }],
            code: 'suite.skip("this is a test", function () { });' +
                'suite.only("this is a different test", function () { });' +
                'suite("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [{ limit: 2 }],
            code: 'context.skip("this is a test", function () { });' +
                'context.only("this is a different test", function () { });' +
                'context("this is a whole different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 2.' }
            ]
        },
        {
            options: [{ limit: 0 }],
            code: 'describe("this is a test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 0.' }
            ]
        },
        {
            options: [{}],
            code: 'describe("this is a test", function () { });' +
                'describe.only("this is a different test", function () { });',
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'foo("this is a test", function () { });' +
                'foo("this is a different test", function () { });',
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'foo("this is a test", function () { });' +
                'foo("this is a different test", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'describe.foo("bar")("this is a test", function () { });' +
                'context.foo("this is a different test", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'describe.foo()', type: 'suite', interface: 'BDD' },
                        { name: 'context.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        },
        {
            code: 'forEach([ 1, 2, 3 ]).describe("this is a test", function () { });' +
                'context.foo("this is a different test", function () { });',
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe', type: 'suite', interface: 'BDD' },
                        { name: 'context.foo', type: 'suite', interface: 'BDD' }
                    ]
                }
            },
            errors: [
                { message: 'The number of top-level suites is more than 1.' }
            ]
        }
    ]
});
