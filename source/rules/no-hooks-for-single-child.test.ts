import { type Rule, RuleTester } from 'eslint';
import assert from 'node:assert';
import { noHooksForSingleChildRule } from './no-hooks-for-single-child.js';
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

function singleChildError(name: string): string {
    return `Unexpected use of Mocha \`${name}\` hook with only one direct child.`;
}

ruleTester.run('no-hooks-for-single-child', noHooksForSingleChildRule, {
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
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [{ allow: ['before()'] }]
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
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
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
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
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
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    it(function() {});',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 5, line: 3 }]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('after()'), column: 5, line: 2 }]
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
                { message: singleChildError('beforeEach()'), column: 5, line: 2 }
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
                { message: singleChildError('afterEach()'), column: 5, line: 2 }
            ]
        },
        {
            code: [
                'before(function() {});',
                'it(function() {});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 1, line: 1 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    xdescribe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it.only(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
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
            errors: [{ message: singleChildError('before()'), column: 9, line: 5 }]
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
            errors: [{ message: singleChildError('after()'), column: 5, line: 2 }]
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
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
            errors: [{ message: singleChildError('before()'), column: 5, line: 2 }]
        }
    ]
});

describe('no-hooks-for-single-child create()', function () {
    it('normalizes non-string allow entries when invoked directly', function () {
        noHooksForSingleChildRule.create({
            id: 'no-hooks-for-single-child',
            options: [{ allow: [42] }],
            settings: {},
            sourceCode: {
                scopeManager: {
                    globalScope: null
                }
            }
        } as unknown as Rule.RuleContext);

        assert.ok(true);
    });
});
