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
            name: 'valid case 1'
        },
        {
            code: 'describe(function() { after(function() {}); it(function() {}); });',
            options,
            name: 'valid case 2'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); it(function() {}); });',
            options,
            name: 'valid case 3'
        },
        {
            code: 'describe(function() { afterEach(function() {}); it(function() {}); });',
            options,
            name: 'valid case 4'
        },
        {
            code: 'describe(function() { before(function() {}); after(function() {}); });',
            options,
            name: 'valid case 5'
        },
        {
            code: 'describe(function() { before(function() {}); beforeEach(function() {}); });',
            options,
            name: 'valid case 6'
        },
        {
            code: 'describe(function() { beforeEach(function() {}); afterEach(function() {}); });',
            options,
            name: 'valid case 7'
        },
        {
            code: 'before(function() {}); beforeEach(function() {});',
            options,
            name: 'valid case 8'
        },
        {
            code: 'foo.before(function() {}); foo.before(function() {});',
            options,
            name: 'valid case 9'
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
            name: 'valid case 10'
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
            name: 'valid case 11'
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
            name: 'valid case 12'
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
            name: 'valid case 13'
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
            name: 'valid case 14'
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
            name: 'valid case 15'
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
            name: 'valid case 16'
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
            name: 'valid case 17'
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
            name: 'valid case 18'
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
            name: 'valid case 19',
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
            name: 'valid case 20',
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
            name: 'valid case 21',
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
            name: 'valid case 22',
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
            name: 'valid case 23',
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
