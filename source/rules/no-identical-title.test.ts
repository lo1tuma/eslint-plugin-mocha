import { RuleTester } from 'eslint';
import { noIdenticalTitleRule } from './no-identical-title.ts';

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });

ruleTester.run('no-identical-title', noIdenticalTitleRule, {
    valid: [
        [
            'describe("describe", function() {',
            '   it("it", function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '   it("it1", function() {});',
            '   it("it2", function() {});',
            '});'
        ]
            .join('\n'),
        [
            'it("it1", function() {});',
            'it("it2", function() {});'
        ]
            .join('\n'),
        'it("Stryker was here", function() {});',
        [
            'it.only("it1", function() {});',
            'it("it2", function() {});'
        ]
            .join('\n'),
        [
            'it.only("it1", function() {});',
            'it.only("it2", function() {});'
        ]
            .join('\n'),
        [
            'describe("title", function() {});',
            'it("title", function() {});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '   it("it1", function() {});',
            '   describe("describe2", function() {',
            '       it("it1", function() {});',
            '   });',
            '});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {',
            '       it("it1", function() {});',
            '   });',
            '   it("it1", function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {});',
            '});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '   describe("describe2", function() {});',
            '});',
            'describe("describe2", function() {});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {});',
            'describe("describe2", function() {});'
        ]
            .join('\n'),
        'describe();',
        'describe("Stryker was here", function() {});',
        [
            'it("it" + n, function() {});',
            'it("it" + n, function() {});'
        ]
            .join('\n'),
        {
            code: [
                [ 'it(`it', '{n}`, function() {});' ].join('$'),
                [ 'it(`it', '{n}`, function() {});' ].join('$')
            ]
                .join('\n'),
            languageOptions: {
                ecmaVersion: 2017
            }
        },
        [
            'describe("title " + foo, function() {',
            '    describe("describe1", function() {});',
            '});',
            'describe("describe1", function() {});'
        ]
            .join('\n'),
        [
            'describe("describe1", function() {',
            '    describe("describe2", function() {});',
            '    describe("title " + foo, function() {',
            '        describe("describe2", function() {});',
            '    });',
            '});'
        ]
            .join('\n'),
        [
            'it(null, function() {});',
            'it(null, function() {});'
        ]
            .join('\n'),
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe2", function() {});'
            ]
                .join('\n'),
            name: 'accepts distinct custom suite titles from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe2", function() {});'
            ]
                .join('\n'),
            name: 'accepts distinct custom suite titles from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        },
        [
            'describe("describe 1", function() {',
            '   it("it", function() {});',
            '});',
            'describe("describe 2", function() {',
            '   it("it", function() {});',
            '});'
        ]
            .join('\n')
    ],

    invalid: [
        {
            code: [
                'describe("describe1", function() {',
                '   it("it1", function() {});',
                '   it("it1", function() {});',
                '});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test title is used multiple times in the same test suite.',
                column: 4,
                line: 3,
                endLine: 3,
                endColumn: 28
            } ]
        },
        {
            code: [
                'it("it1", function() {});',
                'it("it1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test title is used multiple times in the same test suite.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 25
            } ]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it("it1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test title is used multiple times in the same test suite.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 25
            } ]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it.only("it1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test title is used multiple times in the same test suite.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 30
            } ]
        },
        {
            code: [
                'it("it1", function() {});',
                'specify("it1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test title is used multiple times in the same test suite.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 30
            } ]
        },
        {
            code: [
                'describe("describe1", function() {});',
                'describe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test suite title is used multiple times.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 37
            } ]
        },
        {
            code: [
                'describe("describe1", function() {});',
                'xdescribe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test suite title is used multiple times.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 38
            } ]
        },
        {
            code: [
                'describe("describe1", function() {',
                '   describe("describe2", function() {});',
                '});',
                'describe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test suite title is used multiple times.',
                column: 1,
                line: 4,
                endLine: 4,
                endColumn: 37
            } ]
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test suite title is used multiple times.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 32
            } ],
            name: 'reports duplicate custom suite titles from legacy settings',
            settings: {
                'mocha/additionalCustomNames': [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
            }
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe1", function() {});'
            ]
                .join('\n'),
            errors: [ {
                message: 'Test suite title is used multiple times.',
                column: 1,
                line: 2,
                endLine: 2,
                endColumn: 32
            } ],
            name: 'reports duplicate custom suite titles from nested settings',
            settings: {
                mocha: {
                    additionalCustomNames: [ { name: 'foo', type: 'suite', interface: 'BDD' } ]
                }
            }
        }
    ]
});
