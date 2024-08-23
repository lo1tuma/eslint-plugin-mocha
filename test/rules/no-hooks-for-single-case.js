import { RuleTester } from 'eslint';
import plugin from '../../index.js';
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-hooks-for-single-case', plugin.rules['no-hooks-for-single-case'], {
    valid: [
        [
            'describe(function() {',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    after(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    beforeEach(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    afterEach(function() {});',
            '    it(function() {});',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'before(function() {});',
            'it(function() {});',
            'it(function() {});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    describe(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    xdescribe(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    describe(function() {});',
            '    describe(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it.only(function() {});',
            '    it(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    before(function() {});',
            '    it(function() {});',
            '    describe(function() {',
            '        before(function() {});',
            '        it(function() {});',
            '        it(function() {});',
            '    });',
            '});'
        ]
            .join('\n'),
        [
            'describe(function() {',
            '    describe(function() {',
            '        it(function() {});',
            '        it(function() {});',
            '    });',
            '    afterEach(function() {});',
            '});'
        ]
            .join('\n'),
        [
            'it(function() {});',
            'it(function() {});',
            'afterEach(function() {});'
        ]
            .join('\n'),
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['before'] }]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['after'] }]
        },
        {
            code: [
                'describe(function() {',
                '    beforeEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['beforeEach'] }]
        },
        {
            code: [
                'describe(function() {',
                '    afterEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['afterEach'] }]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['after', 'afterEach'] }]
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interfaces: ['BDD'] }]
                }
            }
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interfaces: ['BDD'] }]
            }
        }
    ],

    invalid: [
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    it(function() {});',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 3 }]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `after` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    beforeEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [
                { message: 'Unexpected use of Mocha `beforeEach` hook for a single test case', column: 5, line: 2 }
            ]
        },
        {
            code: [
                'describe(function() {',
                '    afterEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [
                { message: 'Unexpected use of Mocha `afterEach` hook for a single test case', column: 5, line: 2 }
            ]
        },
        {
            code: [
                'before(function() {});',
                'it(function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 1, line: 1 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    xdescribe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it.only(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '    describe(function() {',
                '        before(function() {});',
                '        it(function() {});',
                '    });',
                '});'
            ]
                .join('\n'),
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 9, line: 5 }]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['before'] }],
            errors: [{ message: 'Unexpected use of Mocha `after` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interfaces: ['BDD'] }]
                }
            },
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interfaces: ['BDD'] }]
            },
            errors: [{ message: 'Unexpected use of Mocha `before` hook for a single test case', column: 5, line: 2 }]
        }
    ]
});
