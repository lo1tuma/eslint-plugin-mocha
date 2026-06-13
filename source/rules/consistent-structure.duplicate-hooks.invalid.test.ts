import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { consistentStructureRule } from './consistent-structure.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const options = [ { disallowDuplicateHooks: true } ];

ruleTester.run('consistent-structure duplicate hooks invalid cases', consistentStructureRule, {
    valid: [],
    invalid: [
        {
            code: 'describe(function() { before(function() {}); before(function() {}); });',
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 46,
                line: 1,
                endLine: 1,
                endColumn: 67
            } ],
            name: 'invalid case 1'
        },
        {
            code: 'describe(function() { after(function() {}); after(function() {}); });',
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `after()` hook',
                column: 45,
                line: 1,
                endLine: 1,
                endColumn: 65
            } ],
            name: 'invalid case 2'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); beforeEach(function() {}); });',
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `beforeEach()` hook',
                column: 50,
                line: 1,
                endLine: 1,
                endColumn: 75
            } ],
            name: 'invalid case 3'
        },
        {
            code: 'describe(function() { afterEach(function() {}); afterEach(function() {}); });',
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `afterEach()` hook',
                column: 49,
                line: 1,
                endLine: 1,
                endColumn: 73
            } ],
            name: 'invalid case 4'
        },
        withInterface('TDD', {
            code: 'setup(function() {}); setup(function() {});',
            options,
            errors: [ { message: 'Unexpected use of duplicate Mocha `setup()` hook', column: 23, line: 1 } ]
        }),
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '        before(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 9,
                line: 5,
                endLine: 5,
                endColumn: 30
            } ],
            name: 'invalid case 5'
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 6'
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    foo(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 7',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: [
                'function createSuite() {',
                '    describe(function() {',
                '        before(function() {});',
                '        before(function() {});',
                '    });',
                '}',
                'createSuite();'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 9,
                line: 4,
                endLine: 4,
                endColumn: 30
            } ],
            name: 'invalid case 8'
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    foo(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 9',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'describe.foo(function() {',
                '    before(function() {});',
                '    describe.foo(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 10',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'describe.foo()(function() {',
                '    before(function() {});',
                '    describe.foo()(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 11',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo()', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'forEach([ 1, 2, 3 ]).describe(function() {',
                '    before(function() {});',
                '    forEach([ 4, 5, 6 ]).describe(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            errors: [ {
                message: 'Unexpected use of duplicate Mocha `before()` hook',
                column: 5,
                line: 6,
                endLine: 6,
                endColumn: 26
            } ],
            name: 'invalid case 12',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'forEach().describe', type: 'suite', interface: 'BDD' } ]
                }
            }
        }
    ]
});
