'use strict';

const { RuleTester } = require('eslint');

const rule = require('../../lib/rules/consistent-spacing-between-blocks.js');

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });

ruleTester.run('require-spacing-between-mocha-calls', rule, {
    valid: [
        // Basic describe block
        `describe('My Test', () => {
      it('does something', () => {});
    });`,

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

        // Mocha functions outside of a describe block
        `it('does something outside a describe block', () => {});
    afterEach(() => {});`
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
        }
    ]
});
