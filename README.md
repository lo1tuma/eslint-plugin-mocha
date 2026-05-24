[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)
[![GitHub Actions status](https://github.com/lo1tuma/eslint-plugin-mocha/workflows/CI/badge.svg)](https://github.com/lo1tuma/eslint-plugin-mocha/actions)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/eslint-plugin-mocha/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/eslint-plugin-mocha)
[![NPM Downloads](https://img.shields.io/npm/dm/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)

# eslint-plugin-mocha

ESLint rules for [Mocha](https://mochajs.org/).

This plugin targets Mocha's current JavaScript interfaces documented for Mocha 11. It does not execute Mocha or require Mocha at runtime.

## Install

This plugin requires ESLint `10.2.0` or later.

```bash
npm install --save-dev eslint-plugin-mocha
```

## Configure

Use the plugin with ESLint's [flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new):

```js
import mochaPlugin from "eslint-plugin-mocha";

export default [
    mochaPlugin.configs.recommended
];
```

## Configs

- `mochaPlugin.configs.recommended`: Practical defaults for most projects.
- `mochaPlugin.configs.all`: Enables every rule.

```js
import mochaPlugin from "eslint-plugin-mocha";

export default [
    mochaPlugin.configs.all
];
```

## Plugin settings

These settings are shared by multiple rules.

- `additionalCustomNames`: Adds custom suite, test, or hook function names. This is useful for Mocha wrappers such as [`ember-mocha`](https://github.com/switchfly/ember-mocha), [`mocha-each`](https://github.com/ryym/mocha-each), or project-specific helpers that wrap setup and teardown. Use `interface: "require"` for wrappers that expose named imports from a helper module instead of importing directly from `mocha`.

```json
{
    "rules": {
        "mocha/no-pending-tests": "error",
        "mocha/no-exclusive-tests": "error"
    },
    "settings": {
        "mocha/additionalCustomNames": [
            {
                "name": "describeModule",
                "type": "suite",
                "interface": "BDD"
            },
            {
                "name": "testModule",
                "type": "testCase",
                "interface": "TDD"
            },
            {
                "name": "prepareTestContexts",
                "type": "hook",
                "interface": "BDD"
            }
        ]
    }
}
```

The `name` field supports these forms:

- Plain name, such as `describeModule`:

```js
describeModule("example", function () {});
```

- Dotted name, such as `describe.modifier`:

```js
describe.modifier("example", function () {});
```

- Name with parentheses, such as `forEach().describe`:

```js
forEach([1, 2, 3]).describe("example", function (n) {});
```

- Combination, such as `forEach().describeModule.modifier`:

```js
forEach([1, 2, 3]).describeModule.modifier("example", function (n) {});
```

- `type`: Selects `suite`, `testCase`, or `hook`.
- `interface`: Selects `BDD`, `TDD`, or `require`. The default is `BDD`. With `require`, rule resolution uses named `import` statements instead of globals. `mocha/consistent-interface` also reports named imports of Mocha interface methods when this setting is `BDD` or `TDD`, which helps catch accidental `require`-style usage and interface misconfiguration earlier.

The plugin supports Mocha's `BDD`, `TDD`, and `Require` interfaces. It does not support Mocha's `Exports` or `QUnit` interfaces, or third-party UIs with different syntax. Many rules depend on suite, test, and hook calls being represented as nested call expressions, which those interfaces do not provide consistently.

For wrapper APIs that still expose suite, test, or hook call functions, use `additionalCustomNames`.

## Rules

For maintainers: the rules table below is generated, and the headers in `documentation/rules/*.md` are partly generated. Refresh them with `npx just update-eslint-docs`.

<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) enabled in.\
⚠️ [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) set to warn in.\
🚫 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) disabled in.\
✅ Set in the `recommended` [configuration](https://github.com/lo1tuma/eslint-plugin-mocha#configs).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                                          | Description                                                             | 💼 | ⚠️ | 🚫 | 🔧 | 💡 |
| :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :- | :- | :- | :- | :- |
| [consistent-interface](documentation/rules/consistent-interface.md)                           | Enforces consistent use of mocha interfaces                             | ✅  |    |    | 🔧 |    |
| [consistent-spacing-between-blocks](documentation/rules/consistent-spacing-between-blocks.md) | Require consistent spacing between blocks                               | ✅  |    |    | 🔧 |    |
| [consistent-structure](documentation/rules/consistent-structure.md)                           | Require consistent structure for Mocha test entities                    | ✅  |    |    |    |    |
| [handle-done-callback](documentation/rules/handle-done-callback.md)                           | Enforces handling of callbacks for async tests in every branch          | ✅  |    |    |    |    |
| [max-top-level-suites](documentation/rules/max-top-level-suites.md)                           | Enforce the number of top-level suites in a single file                 | ✅  |    |    |    |    |
| [no-async-and-done](documentation/rules/no-async-and-done.md)                                 | Disallow async functions that also use a Mocha callback                 | ✅  |    |    |    |    |
| [no-async-in-sync-tests](documentation/rules/no-async-in-sync-tests.md)                       | Disallow async operations in synchronous tests or hooks                 |    |    | ✅  |    |    |
| [no-async-suite](documentation/rules/no-async-suite.md)                                       | Disallow async functions passed to a suite                              | ✅  |    |    | 🔧 |    |
| [no-empty-title](documentation/rules/no-empty-title.md)                                       | Disallow empty suite and test descriptions                              | ✅  |    |    |    |    |
| [no-exclusive-tests](documentation/rules/no-exclusive-tests.md)                               | Disallow exclusive tests                                                |    | ✅  |    |    | 💡 |
| [no-exports](documentation/rules/no-exports.md)                                               | Disallow exports from test files                                        | ✅  |    |    |    | 💡 |
| [no-hooks](documentation/rules/no-hooks.md)                                                   | Disallow hooks                                                          |    |    | ✅  |    |    |
| [no-hooks-for-single-child](documentation/rules/no-hooks-for-single-child.md)                 | Disallow hooks with a single direct child                               |    |    | ✅  |    |    |
| [no-identical-title](documentation/rules/no-identical-title.md)                               | Disallow identical titles                                               | ✅  |    |    |    |    |
| [no-mocha-arrows](documentation/rules/no-mocha-arrows.md)                                     | Disallow arrow functions as arguments to mocha functions                | ✅  |    |    | 🔧 |    |
| [no-nested-suites](documentation/rules/no-nested-suites.md)                                   | Disallow suites to be nested within other suites                        |    |    | ✅  |    |    |
| [no-nested-tests](documentation/rules/no-nested-tests.md)                                     | Disallow tests to be nested within other tests                          | ✅  |    |    |    |    |
| [no-pending-tests](documentation/rules/no-pending-tests.md)                                   | Disallow pending tests                                                  |    | ✅  |    |    | 💡 |
| [no-return-and-callback](documentation/rules/no-return-and-callback.md)                       | Disallow returning in a test or hook function that uses a callback      | ✅  |    |    |    |    |
| [no-return-from-async](documentation/rules/no-return-from-async.md)                           | Disallow returning from an async test or hook                           |    |    | ✅  |    |    |
| [no-root-hooks](documentation/rules/no-root-hooks.md)                                         | Disallow root hooks                                                     |    | ✅  |    |    |    |
| [no-setup-in-suite](documentation/rules/no-setup-in-suite.md)                                 | Disallow setup in suite blocks                                          | ✅  |    |    |    |    |
| [no-synchronous-tests](documentation/rules/no-synchronous-tests.md)                           | Disallow synchronous tests                                              |    |    | ✅  |    |    |
| [no-top-level-tests](documentation/rules/no-top-level-tests.md)                               | Disallow top-level tests                                                | ✅  |    |    |    |    |
| [prefer-arrow-callback](documentation/rules/prefer-arrow-callback.md)                         | Require using arrow functions for callbacks                             |    |    | ✅  | 🔧 |    |
| [valid-suite-title](documentation/rules/valid-suite-title.md)                                 | Require suite descriptions to match a pre-configured regular expression |    |    | ✅  |    |    |
| [valid-test-title](documentation/rules/valid-test-title.md)                                   | Require test descriptions to match a pre-configured regular expression  |    |    | ✅  |    |    |

<!-- end auto-generated rules list -->
