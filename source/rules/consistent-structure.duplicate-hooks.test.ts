import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { consistentStructureRule } from './consistent-structure.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const options = [{ disallowDuplicateHooks: true }];

ruleTester.run('consistent-structure duplicate hooks', consistentStructureRule, {
    valid: [
        { code: 'describe(function() { before(function() {}); it(function() {}); });', options },
        { code: 'describe(function() { after(function() {}); it(function() {}); });', options },
        { code: 'describe(function() { beforeEach(function() {}); it(function() {}); });', options },
        { code: 'describe(function() { afterEach(function() {}); it(function() {}); });', options },
        { code: 'describe(function() { before(function() {}); after(function() {}); });', options },
        { code: 'describe(function() { before(function() {}); beforeEach(function() {}); });', options },
        { code: 'describe(function() { beforeEach(function() {}); afterEach(function() {}); });', options },
        { code: 'before(function() {}); beforeEach(function() {});', options },
        { code: 'foo.before(function() {}); foo.before(function() {});', options },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    describe(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    function runSomeTests() {',
                '        before(function() {});',
                '        it(function() {});',
                '    }',
                '    function runSomeOtherTests() {',
                '        before(function() {});',
                '        it(function() {});',
                '    }',
                '    context(function() {',
                '        before(function() {});',
                '        context(function() {',
                '            runSomeTests();',
                '        });',
                '        context(function() {',
                '            runSomeOtherTests();',
                '        });',
                '    });',
                '    context(function() {',
                '        before(function() {});',
                '        context(function() {',
                '            runSomeTests();',
                '        });',
                '        context(function() {',
                '            runSomeOtherTests();',
                '        });',
                '    });',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    const runSomeTests = () => {',
                '        before(function() {});',
                '        it(function() {});',
                '    };',
                '    context(function() {',
                '        runSomeTests();',
                '    });',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    describe.only(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    describe.skip(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    xdescribe(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    context(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'describe(function() {',
                '    xcontext(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options
        },
        {
            code: [
                'foo(function() {',
                '    foo(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            }
        },
        {
            code: [
                'foo(function() {',
                '    foo(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            options,
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe.foo(function() {',
                '        before(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            options,
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe.foo()(function() {',
                '        before(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            options,
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo()', type: 'suite', interface: 'BDD' }]
                }
            }
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    forEach([ 1, 2, 3 ]).describe(function() {',
                '        before(function() {});',
                '    });',
                '    forEach([ 1, 2, 3 ]).context(function() {',
                '        before(function() {});',
                '    });',
                '    forEach([ 1, 2, 3 ]).describe.only(function() {',
                '        before(function() {});',
                '    });',
                '    forEach([ 1, 2, 3 ]).describe.skip(function() {',
                '        before(function() {});',
                '    });',
                '    forEach([ 1, 2, 3 ]).describe.foo(function() {',
                '        before(function() {});',
                '    });',
                '    forEach([ 1, 2, 3 ]).describe.bar([ 9, 8, 7 ])(function() {',
                '        before(function() {});',
                '    });',
                '    deep.forEach({ a: [ 1, 2, 3 ], b: [ 4, 5, 6 ] }).describe(function() {',
                '        before(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            options,
            settings: {
                mocha: {
                    additionalCustomNames: [
                        { name: 'forEach().describe', type: 'suite', interface: 'BDD' },
                        { name: 'forEach().context', type: 'suite', interface: 'BDD' },
                        { name: 'forEach().describe.foo', type: 'suite', interface: 'BDD' },
                        { name: 'forEach().describe.bar()', type: 'suite', interface: 'BDD' },
                        { name: 'deep.forEach().describe', type: 'suite', interface: 'BDD' }
                    ]
                }
            }
        },
        withInterface('BDD', {
            code: 'describe(function() { setup(function() {}); setup(function() {}); });',
            options
        })
    ],

    invalid: [
        {
            code: 'describe(function() { before(function() {}); before(function() {}); });',
            options,
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 46, line: 1 }]
        },
        {
            code: 'describe(function() { after(function() {}); after(function() {}); });',
            options,
            errors: [{ message: 'Unexpected use of duplicate Mocha `after()` hook', column: 45, line: 1 }]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); beforeEach(function() {}); });',
            options,
            errors: [{ message: 'Unexpected use of duplicate Mocha `beforeEach()` hook', column: 50, line: 1 }]
        },
        {
            code: 'describe(function() { afterEach(function() {}); afterEach(function() {}); });',
            options,
            errors: [{ message: 'Unexpected use of duplicate Mocha `afterEach()` hook', column: 49, line: 1 }]
        },
        withInterface('TDD', {
            code: 'setup(function() {}); setup(function() {});',
            options,
            errors: [{ message: 'Unexpected use of duplicate Mocha `setup()` hook', column: 23, line: 1 }]
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
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 9, line: 5 }]
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
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
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
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
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
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 9, line: 4 }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'describe.foo()', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'forEach().describe', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
        }
    ]
});
