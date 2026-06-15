import { RuleTester } from 'eslint';
import { consistentInterfaceRule } from './consistent-interface.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } });

ruleTester.run('consistent-interface', consistentInterfaceRule, {
    valid: [
        {
            code: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            name: 'accepts global BDD when BDD is expected',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [ { interface: 'TDD' } ],
            name: 'accepts global TDD when TDD is expected',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [ { interface: 'TDD' } ],
            name: 'accepts required TDD imports when require interface is configured',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            name: 'accepts required BDD imports when require interface is configured',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `import {describe as foo, it as bar} from 'mocha'; foo('foo', () => {
                bar('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            name: 'accepts aliased required BDD imports when require interface is configured',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `import {"describe" as describe, "it" as it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
            name: 'accepts string-literal BDD imports when require interface is configured',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: 'import {"run" as run} from "mocha"; run();',
            options: [ { interface: 'BDD' } ],
            languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
            name: 'ignores non-interface string-literal imports',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import {run} from "mocha"; run();',
            options: [ { interface: 'BDD' } ],
            name: 'ignores non-interface named imports',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import mocha from "mocha"; mocha.describe("foo", () => {});',
            name: 'ignores default mocha imports',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import * as mocha from "mocha"; mocha.describe("foo", () => {});',
            name: 'ignores namespace mocha imports',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'describe("foo", function () {});',
            options: [ { interface: 'BDD' } ],
            languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
            name: 'accepts script globals without module scope',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: 'import {setup, teardown} from "mocha"; setup(() => {}); teardown(() => {});',
            options: [ { interface: 'TDD' } ],
            name: 'accepts required TDD hooks when require interface is configured',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `describe('foo', () => {
                it('bar', () => {});
            });`,
            name: 'uses the settings interface when options are omitted',
            settings: { mocha: { interface: 'BDD' } }
        }
    ],

    invalid: [
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            output: null,
            options: [ { interface: 'BDD' } ],
            errors: [ {
                line: 2,
                column: 17,
                message: 'Unexpected use of TDD interface instead of BDD',
                endLine: 2,
                endColumn: 38
            } ],
            name: 'reports TDD tests when BDD is expected',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `describe('foo', () => {
                test('bar', () => {});
            });`,
            output: null,
            options: [ { interface: 'TDD' } ],
            errors: [ {
                line: 1,
                column: 1,
                message: 'Unexpected use of BDD interface instead of TDD',
                endLine: 3,
                endColumn: 15
            } ],
            name: 'reports BDD suites when TDD is expected',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            output: null,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    line: 1,
                    column: 36,
                    message: 'Unexpected use of TDD interface instead of BDD',
                    endLine: 3,
                    endColumn: 15
                },
                {
                    line: 2,
                    column: 17,
                    message: 'Unexpected use of TDD interface instead of BDD',
                    endLine: 2,
                    endColumn: 38
                }
            ],
            name: 'reports required TDD imports when BDD is expected',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: null,
            options: [ { interface: 'TDD' } ],
            errors: [
                {
                    line: 1,
                    column: 37,
                    message: 'Unexpected use of BDD interface instead of TDD',
                    endLine: 3,
                    endColumn: 15
                },
                {
                    line: 2,
                    column: 17,
                    message: 'Unexpected use of BDD interface instead of TDD',
                    endLine: 2,
                    endColumn: 36
                }
            ],
            name: 'reports required BDD imports when TDD is expected',
            settings: { mocha: { interface: 'require' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 17
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 19,
                    endLine: 1,
                    endColumn: 21
                }
            ],
            name: 'removes BDD imports when global BDD is expected',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `import {suite, test} from 'mocha'; suite('foo', () => {
                test('bar', () => {});
            });`,
            output: `suite('foo', () => {
                test('bar', () => {});
            });`,
            options: [ { interface: 'TDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 14
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 16,
                    endLine: 1,
                    endColumn: 20
                }
            ],
            name: 'removes TDD imports when global TDD is expected',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {describe as foo, it as bar} from 'mocha'; foo('foo', () => {
                bar('bar', () => {});
            });`,
            output: null,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 21,
                    endLine: 1,
                    endColumn: 24
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 32,
                    endLine: 1,
                    endColumn: 35
                }
            ],
            name: 'reports aliased BDD imports when global TDD is configured',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {"describe" as describe, "it" as it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'BDD' } ],
            languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 23,
                    endLine: 1,
                    endColumn: 31
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 41,
                    endLine: 1,
                    endColumn: 43
                }
            ],
            name: 'reports string-literal BDD imports when global TDD is configured',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: `import {describe, it} from 'mocha'; describe('foo', () => {
                it('bar', () => {});
            });`,
            output: `describe('foo', () => {
                it('bar', () => {});
            });`,
            options: [ { interface: 'TDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 17
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 19,
                    endLine: 1,
                    endColumn: 21
                }
            ],
            name: 'uses settings interface for import removal when options differ',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `import {describe, run} from 'mocha'; describe('foo', () => {
                run();
            });`,
            output: `import {run} from 'mocha'; describe('foo', () => {
                run();
            });`,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 17
                }
            ],
            name: 'removes a leading fixable import specifier',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: "import {run, describe} from 'mocha'; describe('foo', () => {});",
            output: "import {run} from 'mocha'; describe('foo', () => {});",
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 14,
                    endLine: 1,
                    endColumn: 22
                }
            ],
            name: 'removes a trailing fixable import specifier',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `import {context, specify, before, after, beforeEach, afterEach} from 'mocha';
                context('foo', () => {});
                specify('bar', () => {});
                before(() => {});
                after(() => {});
                beforeEach(() => {});
                afterEach(() => {});`,
            output: `context('foo', () => {});
                specify('bar', () => {});
                before(() => {});
                after(() => {});
                beforeEach(() => {});
                afterEach(() => {});`,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 16
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 18,
                    endLine: 1,
                    endColumn: 25
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 27,
                    endLine: 1,
                    endColumn: 33
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 35,
                    endLine: 1,
                    endColumn: 40
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 42,
                    endLine: 1,
                    endColumn: 52
                },
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 54,
                    endLine: 1,
                    endColumn: 63
                }
            ],
            name: 'removes BDD hook imports when global BDD is expected',
            settings: { mocha: { interface: 'BDD' } }
        },
        {
            code: `import {suiteSetup, suiteTeardown, setup, teardown} from 'mocha';
                suiteSetup(() => {});
                suiteTeardown(() => {});
                setup(() => {});
                teardown(() => {});`,
            output: `suiteSetup(() => {});
                suiteTeardown(() => {});
                setup(() => {});
                teardown(() => {});`,
            options: [ { interface: 'TDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 9,
                    endLine: 1,
                    endColumn: 19
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 21,
                    endLine: 1,
                    endColumn: 34
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 36,
                    endLine: 1,
                    endColumn: 41
                },
                {
                    message: 'Unexpected use of require interface instead of global TDD',
                    line: 1,
                    column: 43,
                    endLine: 1,
                    endColumn: 51
                }
            ],
            name: 'removes TDD hook imports when global TDD is expected',
            settings: { mocha: { interface: 'TDD' } }
        },
        {
            code: 'import mocha, {describe} from "mocha"; describe("foo", () => {});',
            output: null,
            options: [ { interface: 'BDD' } ],
            errors: [
                {
                    message: 'Unexpected use of require interface instead of global BDD',
                    line: 1,
                    column: 16,
                    endLine: 1,
                    endColumn: 24
                }
            ],
            name: 'does not fix mixed default and named imports',
            settings: { mocha: { interface: 'BDD' } }
        }
    ]
});
