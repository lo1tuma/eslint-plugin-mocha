import { RuleTester } from 'eslint';
import { consistentInterfaceRule } from './consistent-interface.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } });

ruleTester.run('consistent-interface', consistentInterfaceRule, {
    valid: [
        {
            code: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'exports' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } }
        },
        {
            code: `import {describe as foo, it as bar} from 'mocha'; foo('foo', () => {
                bar('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } }
        }
    ],

    invalid: [
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'BDD' } },
            errors: [{ line: 2, column: 17, message: 'Unexpected use of TDD interface instead of BDD' }]
        },
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'TDD' } },
            errors: [{ line: 1, column: 1, message: 'Unexpected use of BDD interface instead of TDD' }]
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [{ interface: 'BDD' }],
            settings: { mocha: { interface: 'exports' } },
            errors: [
                { line: 1, column: 36, message: 'Unexpected use of TDD interface instead of BDD' },
                { line: 2, column: 17, message: 'Unexpected use of TDD interface instead of BDD' }
            ]
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [{ interface: 'TDD' }],
            settings: { mocha: { interface: 'exports' } },
            errors: [
                { line: 1, column: 37, message: 'Unexpected use of BDD interface instead of TDD' },
                { line: 2, column: 17, message: 'Unexpected use of BDD interface instead of TDD' }
            ]
        }
    ]
});
