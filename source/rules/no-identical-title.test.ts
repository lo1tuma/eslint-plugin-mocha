import { RuleTester } from 'eslint';
import { noIdenticalTitleRule } from './no-identical-title.js';
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
        [
            'it("it" + n, function() {});',
            'it("it" + n, function() {});'
        ]
            .join('\n'),
        {
            code: [
                'it(`it${n}`, function() {});',
                'it(`it${n}`, function() {});'
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
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe2", function() {});'
            ]
                .join('\n'),
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            }
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe2", function() {});'
            ]
                .join('\n'),
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            }
        }
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
            errors: [{ message: 'Test title is used multiple times in the same test suite.', column: 4, line: 3 }]
        },
        {
            code: [
                'it("it1", function() {});',
                'it("it1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 }]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it("it1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 }]
        },
        {
            code: [
                'it.only("it1", function() {});',
                'it.only("it1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 }]
        },
        {
            code: [
                'it("it1", function() {});',
                'specify("it1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test title is used multiple times in the same test suite.', column: 1, line: 2 }]
        },
        {
            code: [
                'describe("describe1", function() {});',
                'describe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test suite title is used multiple times.', column: 1, line: 2 }]
        },
        {
            code: [
                'describe("describe1", function() {});',
                'xdescribe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test suite title is used multiple times.', column: 1, line: 2 }]
        },
        {
            code: [
                'describe("describe1", function() {',
                '   describe("describe2", function() {});',
                '});',
                'describe("describe1", function() {});'
            ]
                .join('\n'),
            errors: [{ message: 'Test suite title is used multiple times.', column: 1, line: 4 }]
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe1", function() {});'
            ]
                .join('\n'),
            settings: {
                'mocha/additionalCustomNames': [{ name: 'foo', type: 'suite', interface: 'BDD' }]
            },
            errors: [{ message: 'Test suite title is used multiple times.', column: 1, line: 2 }]
        },
        {
            code: [
                'foo("describe1", function() {});',
                'foo("describe1", function() {});'
            ]
                .join('\n'),
            settings: {
                mocha: {
                    additionalCustomNames: [{ name: 'foo', type: 'suite', interface: 'BDD' }]
                }
            },
            errors: [{ message: 'Test suite title is used multiple times.', column: 1, line: 2 }]
        }
    ]
});
