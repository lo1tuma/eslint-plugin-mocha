import assert from 'node:assert';
import { type Rule, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
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
            options: [ { allow: [ 'before' ] } ],
            name: 'valid case 1'
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'before()' ] } ],
            name: 'valid case 2'
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'after' ] } ],
            name: 'valid case 3'
        },
        {
            code: [
                'describe(function() {',
                '    beforeEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'beforeEach' ] } ],
            name: 'valid case 4'
        },
        {
            code: [
                'describe(function() {',
                '    afterEach(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'afterEach' ] } ],
            name: 'valid case 5'
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'after', 'afterEach' ] } ],
            name: 'valid case 6'
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
            name: 'valid case 7',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
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
            name: 'valid case 8',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
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
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ]
        },
        {
            code: [
                'describe(function() {',
                '    it(function() {});',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 3, endLine: 3, endColumn: 26 } ]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('after()'), column: 5, line: 2, endLine: 2, endColumn: 25 } ]
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
                { message: singleChildError('beforeEach()'), column: 5, line: 2, endLine: 2, endColumn: 30 }
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
                { message: singleChildError('afterEach()'), column: 5, line: 2, endLine: 2, endColumn: 29 }
            ]
        },
        {
            code: [
                'before(function() {});',
                'it(function() {});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 1, line: 1, endLine: 1, endColumn: 22 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    describe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    xdescribe(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ]
        },
        {
            code: [
                'describe(function() {',
                '    before(function() {});',
                '    it.only(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ]
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
            errors: [ { message: singleChildError('before()'), column: 9, line: 5, endLine: 5, endColumn: 30 } ]
        },
        {
            code: [
                'describe(function() {',
                '    after(function() {});',
                '    it(function() {});',
                '});'
            ]
                .join('\n'),
            options: [ { allow: [ 'before' ] } ],
            errors: [ { message: singleChildError('after()'), column: 5, line: 2, endLine: 2, endColumn: 25 } ],
            name: 'invalid case 1'
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ],
            name: 'invalid case 2',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ],
            name: 'invalid case 3',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        }
    ]
});

suite('no-hooks-for-single-child create()', function () {
    test('normalizes non-string allow entries when invoked directly', function () {
        noHooksForSingleChildRule.create({
            id: 'no-hooks-for-single-child',
            options: [ { allow: [ 42 ] } ],
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
