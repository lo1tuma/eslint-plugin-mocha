import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { consistentStructureRule } from './consistent-structure.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('consistent-structure', consistentStructureRule, {
    valid: [
        'describe(function() { before(function() {}); it(function() {}); describe(function() {}); });',
        'describe(function() { before(function() {}); beforeEach(function() {}); it(function() {}); });',
        'describe(function() { after(function() {}); });',
        'describe(function() { describe(function() {}); describe(function() {}); });',
        'describe(function() { it(function() {}); it(function() {}); });',
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: false }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ order: 'off', disallowMixedTestsAndSuites: false }]
        },
        withInterface('TDD', {
            code: 'suite(function() { setup(function() {}); suite(function() {}); suite(function() {}); });',
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }]
        }),
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        }
    ],

    invalid: [
        {
            code: 'describe(function() { it(function() {}); before(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected hook after a test case.', column: 42, line: 1 }]
        },
        {
            code: 'describe(function() { describe(function() {}); before(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected hook after a child suite.', column: 48, line: 1 }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ order: 'hooks-tests-suites' }],
            errors: [{ message: 'Unexpected test case after a child suite.', column: 48, line: 1 }]
        },
        {
            code: 'describe(function() { it(function() {}); describe(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: true }],
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 42,
                line: 1
            }]
        },
        {
            code: 'describe(function() { describe(function() {}); it(function() {}); });',
            options: [{ disallowMixedTestsAndSuites: true }],
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 48,
                line: 1
            }]
        },
        {
            code: [
                'describe(function() {',
                '    describe(function() {});',
                '    it(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 5, line: 3 },
                { message: 'Unexpected mix of test cases and child suites at the same level.', column: 5, line: 3 },
                { message: 'Unexpected test case after a child suite.', column: 5, line: 4 }
            ]
        },
        withInterface('TDD', {
            code: 'suite(function() { suite(function() {}); test(function() {}); });',
            options: [{ order: 'hooks-tests-suites', disallowMixedTestsAndSuites: true }],
            errors: [
                { message: 'Unexpected test case after a child suite.', column: 42, line: 1 },
                { message: 'Unexpected mix of test cases and child suites at the same level.', column: 42, line: 1 }
            ]
        }),
        {
            code: [
                'foo(function() {',
                '    it(function() {});',
                '    foo(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ disallowMixedTestsAndSuites: true }],
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{
                message: 'Unexpected mix of test cases and child suites at the same level.',
                column: 5,
                line: 3
            }]
        }
    ]
});
