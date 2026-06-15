import { RuleTester } from 'eslint';
import { withInterface } from '../mocha-interface-test-cases.js';
import { consistentStructureRule } from './consistent-structure.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const options = [ { disallowDuplicateHooks: true } ];

ruleTester.run('consistent-structure duplicate hooks', consistentStructureRule, {
    valid: [
        {
            code: 'describe(function() { before(function() {}); it(function() {}); });',
            options,
            name: 'allows a single before hook'
        },
        {
            code: 'describe(function() { after(function() {}); it(function() {}); });',
            options,
            name: 'allows a single after hook'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); it(function() {}); });',
            options,
            name: 'allows a single beforeEach hook'
        },
        {
            code: 'describe(function() { afterEach(function() {}); it(function() {}); });',
            options,
            name: 'allows a single afterEach hook'
        },
        {
            code: 'describe(function() { before(function() {}); after(function() {}); });',
            options,
            name: 'allows before and after hooks together'
        },
        {
            code: 'describe(function() { before(function() {}); beforeEach(function() {}); });',
            options,
            name: 'allows before and beforeEach hooks together'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); afterEach(function() {}); });',
            options,
            name: 'allows beforeEach and afterEach hooks together'
        },
        {
            code: 'before(function() {}); beforeEach(function() {});',
            options,
            name: 'allows different hooks at top level'
        },
        {
            code: 'foo.before(function() {}); foo.before(function() {});',
            options,
            name: 'ignores member-expression hooks without custom settings'
        },
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
            options,
            name: 'allows same hook in parent and child suites'
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
            options,
            name: 'allows same hook in child and parent suites'
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
            options,
            name: 'allows reused setup functions in separate suite scopes'
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
            options,
            name: 'allows arrow setup helpers inside child suites'
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
            options,
            name: 'allows same hook in describe.only and parent suites'
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
            options,
            name: 'allows same hook in describe.skip and parent suites'
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
            options,
            name: 'allows same hook in xdescribe and parent suites'
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
            options,
            name: 'allows same hook in context and parent suites'
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
            options,
            name: 'allows same hook in xcontext and parent suites'
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
            name: 'allows legacy custom suite settings to scope hooks',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
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
            name: 'allows custom suite settings to scope hooks',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
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
            name: 'allows custom member suite names to scope hooks',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo', type: 'suite', interface: 'BDD' } ]
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
            name: 'allows custom callable member suite names to scope hooks',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'describe.foo()', type: 'suite', interface: 'BDD' } ]
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
            name: 'allows dynamic custom suite names to scope hooks',
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
    invalid: []
});
