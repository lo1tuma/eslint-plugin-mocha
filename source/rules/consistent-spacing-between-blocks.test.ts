import { RuleTester } from 'eslint';
import { consistentSpacingBetweenBlocksRule } from './consistent-spacing-between-blocks.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'script' } });

ruleTester.run('consistent-spacing-between-mocha-calls', consistentSpacingBetweenBlocksRule, {
    valid: [
        `describe();

        describe();`,

        {
            code: `describe('My Test', () => {
            it('does something', () => {});
        });`
        },

        // Proper line break before each block within describe
        `describe('My Test', () => {
            it('performs action one', () => {});

            it('performs action two', () => {});
        });`,

        // Nested describe blocks with proper spacing
        `describe('Outer block', () => {
            describe('Inner block', () => {
                it('performs an action', () => {});
            });

            afterEach(() => {});
        });`,

        // Describe block with comments
        `describe('My Test With Comments', () => {
            it('does something', () => {});

            // Some comment
            afterEach(() => {});
        });`,

        `it('does something outside a describe block', () => {});

        afterEach(() => {});`,
        {
            code: `describe('foo', () => {
                it('bar', () => {}).timeout(42);
            });`
        },
        {
            code: `describe('foo', () => {
                it('bar', () => {}).timeout(42);

                it('baz', () => {}).timeout(42);
            });`
        },
        {
            code: `describe('foo', () => {
                it('bar', () => {})
                    .timeout(42);

                it('baz', () => {})
                    .timeout(42);
            });`
        }
    ],

    invalid: [
        // Missing line break between it and afterEach
        {
            code: `describe('My Test', function () {
                it('does something', () => {});
                afterEach(() => {});
            });`,
            output: `describe('My Test', function () {
                it('does something', () => {});

                afterEach(() => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },

        // Missing line break between beforeEach and it
        {
            code: `describe('My Test', () => {
                beforeEach(() => {});
                it('does something', () => {});
            });`,
            output: `describe('My Test', () => {
                beforeEach(() => {});

                it('does something', () => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },

        // Missing line break after a variable declaration
        {
            code: `describe('Variable declaration', () => {
                const a = 1;
                it('uses a variable', () => {});
            });`,
            output: `describe('Variable declaration', () => {
                const a = 1;

                it('uses a variable', () => {});
            });`,
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },

        // Blocks on the same line
        {
            code: "describe('Same line blocks', () => {" +
                "it('block one', () => {});" +
                "it('block two', () => {});" +
                '});',
            output: "describe('Same line blocks', () => {" +
                "it('block one', () => {});" +
                '\n\n' +
                "it('block two', () => {});" +
                '});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },
        {
            code: "describe('Same line blocks', () => {" +
                "it('block one', () => {})\n.timeout(42);" +
                "it('block two', () => {});" +
                '});',
            output: "describe('Same line blocks', () => {" +
                "it('block one', () => {})\n.timeout(42);" +
                '\n\n' +
                "it('block two', () => {});" +
                '});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },

        {
            code: 'describe("", () => {});describe("", () => {});',
            output: 'describe("", () => {});\n\ndescribe("", () => {});',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        },

        {
            code: 'describe();\ndescribe();',
            output: 'describe();\n\ndescribe();',
            errors: [
                {
                    message: 'Expected line break before this statement.',
                    type: 'CallExpression'
                }
            ]
        }
    ]
});
