[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)
[![GitHub Actions status](https://github.com/lo1tuma/eslint-plugin-mocha/workflows/CI/badge.svg)](https://github.com/lo1tuma/eslint-plugin-mocha/actions)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/eslint-plugin-mocha/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/eslint-plugin-mocha)
[![NPM Downloads](https://img.shields.io/npm/dm/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)

# eslint-plugin-mocha

ESLint rules for [Mocha](https://mochajs.org/).

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

- `additionalCustomNames`: Adds custom suite or test function names. This is useful for Mocha wrappers such as [`ember-mocha`](https://github.com/switchfly/ember-mocha) or [`mocha-each`](https://github.com/ryym/mocha-each).

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

- `interface`: Selects `BDD`, `TDD`, or `exports`. The default is `BDD`. With `exports`, rule resolution uses named `import` statements instead of globals. `mocha/consistent-interface` also reports named imports of Mocha interface methods when this setting is `BDD` or `TDD`, which helps catch accidental `exports`-style usage and interface misconfiguration earlier.

## Rules

For maintainers: the rules table below is generated, and the headers in `documentation/rules/*.md` are partly generated. Refresh them with `npm run update:eslint-docs`.

<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) enabled in.\
⚠️ [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) set to warn in.\
🚫 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) disabled in.\
✅ Set in the `recommended` [configuration](https://github.com/lo1tuma/eslint-plugin-mocha#configs).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                          | Description                                                             | 💼 | ⚠️ | 🚫 | 🔧 |
| :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :- | :- | :- | :- |
| [consistent-interface](documentation/rules/consistent-interface.md)                           | Enforces consistent use of mocha interfaces                             | ✅  |    |    | 🔧 |
| [consistent-spacing-between-blocks](documentation/rules/consistent-spacing-between-blocks.md) | Require consistent spacing between blocks                               | ✅  |    |    | 🔧 |
| [handle-done-callback](documentation/rules/handle-done-callback.md)                           | Enforces handling of callbacks for async tests                          | ✅  |    |    |    |
| [max-top-level-suites](documentation/rules/max-top-level-suites.md)                           | Enforce the number of top-level suites in a single file                 | ✅  |    |    |    |
| [no-async-suite](documentation/rules/no-async-suite.md)                                       | Disallow async functions passed to a suite                              | ✅  |    |    | 🔧 |
| [no-empty-title](documentation/rules/no-empty-title.md)                                       | Disallow empty test descriptions                                        | ✅  |    |    |    |
| [no-exclusive-tests](documentation/rules/no-exclusive-tests.md)                               | Disallow exclusive tests                                                |    | ✅  |    | 🔧 |
| [no-exports](documentation/rules/no-exports.md)                                               | Disallow exports from test files                                        | ✅  |    |    |    |
| [no-global-tests](documentation/rules/no-global-tests.md)                                     | Disallow global tests                                                   | ✅  |    |    |    |
| [no-hooks](documentation/rules/no-hooks.md)                                                   | Disallow hooks                                                          |    |    | ✅  |    |
| [no-hooks-for-single-case](documentation/rules/no-hooks-for-single-case.md)                   | Disallow hooks for a single test or test suite                          |    |    | ✅  |    |
| [no-identical-title](documentation/rules/no-identical-title.md)                               | Disallow identical titles                                               | ✅  |    |    |    |
| [no-mocha-arrows](documentation/rules/no-mocha-arrows.md)                                     | Disallow arrow functions as arguments to mocha functions                | ✅  |    |    | 🔧 |
| [no-nested-tests](documentation/rules/no-nested-tests.md)                                     | Disallow tests to be nested within other tests                          | ✅  |    |    |    |
| [no-pending-tests](documentation/rules/no-pending-tests.md)                                   | Disallow pending tests                                                  |    | ✅  |    |    |
| [no-return-and-callback](documentation/rules/no-return-and-callback.md)                       | Disallow returning in a test or hook function that uses a callback      | ✅  |    |    |    |
| [no-return-from-async](documentation/rules/no-return-from-async.md)                           | Disallow returning from an async test or hook                           |    |    | ✅  |    |
| [no-setup-in-describe](documentation/rules/no-setup-in-describe.md)                           | Disallow setup in describe blocks                                       | ✅  |    |    |    |
| [no-sibling-hooks](documentation/rules/no-sibling-hooks.md)                                   | Disallow duplicate uses of a hook at the same level inside a suite      | ✅  |    |    |    |
| [no-synchronous-tests](documentation/rules/no-synchronous-tests.md)                           | Disallow synchronous tests                                              |    |    | ✅  |    |
| [no-top-level-hooks](documentation/rules/no-top-level-hooks.md)                               | Disallow top-level hooks                                                |    | ✅  |    |    |
| [prefer-arrow-callback](documentation/rules/prefer-arrow-callback.md)                         | Require using arrow functions for callbacks                             |    |    | ✅  | 🔧 |
| [valid-suite-title](documentation/rules/valid-suite-title.md)                                 | Require suite descriptions to match a pre-configured regular expression |    |    | ✅  |    |
| [valid-test-title](documentation/rules/valid-test-title.md)                                   | Require test descriptions to match a pre-configured regular expression  |    |    | ✅  |    |

<!-- end auto-generated rules list -->
