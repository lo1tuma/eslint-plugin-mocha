import { RuleTester } from 'eslint';
import plugin from '../../index.js';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-sibling-hooks', plugin.rules['no-sibling-hooks'], {
    valid: [
        'describe(function() { before(function() {}); it(function() {}); });',
        'describe(function() { after(function() {}); it(function() {}); });',
        'describe(function() { beforeEach(function() {}); it(function() {}); });',
        'describe(function() { afterEach(function() {}); it(function() {}); });',
        'describe(function() { before(function() {}); after(function() {}); });',
        'describe(function() { before(function() {}); beforeEach(function() {}); });',
        'describe(function() { beforeEach(function() {}); afterEach(function() {}); });',
        'before(function() {}); beforeEach(function() {});',
        'foo.before(function() {}); foo.before(function() {});',
        [
            'describe(function() {',
            '    before(function() {});',
            '    describe(function() {',
            '        before(function() {});',
            '    });',
            '});'
        ]
            .join('\n'),
        {
            code: [
                'describe(function() {',
                '    describe(function() {',
                '        before(function() {});',
                '    });',
                '    before(function() {});',
                '});'
            ]
                .join('\n')
        },
        [
            'describe(function() {',
            '    describe.only(function() {',
            '        before(function() {});',
            '    });',
            '    before(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    describe.skip(function() {',
            '        before(function() {});',
            '    });',
            '    before(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    xdescribe(function() {',
            '        before(function() {});',
            '    });',
            '    before(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    context(function() {',
            '        before(function() {});',
            '    });',
            '    before(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    xcontext(function() {',
            '        before(function() {});',
            '    });',
            '    before(function() {});',
            '});'
        ]
            .join('\n'),
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
        }
    ],

    invalid: [
        {
            code: 'describe(function() { before(function() {}); before(function() {}); });',
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 46, line: 1 }]
        },
        {
            code: 'describe(function() { after(function() {}); after(function() {}); });',
            errors: [{ message: 'Unexpected use of duplicate Mocha `after()` hook', column: 45, line: 1 }]
        },
        {
            code: 'describe(function() { beforeEach(function() {}); beforeEach(function() {}); });',
            errors: [{ message: 'Unexpected use of duplicate Mocha `beforeEach()` hook', column: 50, line: 1 }]
        },
        {
            code: 'describe(function() { afterEach(function() {}); afterEach(function() {}); });',
            errors: [{ message: 'Unexpected use of duplicate Mocha `afterEach()` hook', column: 49, line: 1 }]
        },
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
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
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
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'forEach().describe', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Unexpected use of duplicate Mocha `before()` hook', column: 5, line: 6 }]
        }
    ]
});
