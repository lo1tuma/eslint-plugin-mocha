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
            name: 'allows before hooks when configured'
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
            name: 'allows before hook call paths when configured'
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
            name: 'allows after hooks when configured'
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
            name: 'allows beforeEach hooks when configured'
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
            name: 'allows afterEach hooks when configured'
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
            name: 'allows any configured hook from multiple allowed names'
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
            name: 'allows custom suites with multiple children',
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
            name: 'allows custom suites from legacy settings with multiple children',
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
            name: 'reports disallowed hooks in single-child suites'
        },
        {
            code: [
                'foo(function() {',
                '    before(function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ { message: singleChildError('before()'), column: 5, line: 2, endLine: 2, endColumn: 26 } ],
            name: 'reports custom single-child suites from nested settings',
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
            name: 'reports custom single-child suites from legacy settings',
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
