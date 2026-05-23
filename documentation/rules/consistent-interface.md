# Enforces consistent use of mocha interfaces (`mocha/consistent-interface`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Mocha has several interfaces such as `BDD`, `TDD`, `Require`, `Exports`, `QUnit` etc. Usually Mocha injects the variables and functions of the selected interface into the global scope. When using the `Require` interface, named imports from `mocha` are used instead. This rule enforces a consistent `BDD` or `TDD` interface for imported Mocha interface methods, and it also reports imported Mocha interface methods when `settings.mocha.interface` is configured for globals.

## Options

Example of a custom rule configuration:

```js
rules: {
    "mocha/consistent-interface": ["error", { interface: 'BDD' }]
},
```

where:

- `interface` can be set to either `TDD` or `BDD`

## Rule Details

With `settings.mocha.interface: "require"`, this rule enforces that imported Mocha interface methods all belong to the configured `BDD` or `TDD` interface.

With `settings.mocha.interface: "BDD"` or `settings.mocha.interface: "TDD"`, this rule reports named imports of Mocha interface methods from `mocha`, because those imports indicate `require`-style usage and can prevent other rules from recognizing Mocha calls.

The autofix is intentionally limited to direct named imports such as `import { describe } from 'mocha'`. Aliased imports and mixed default imports are still reported, but they are left for manual cleanup.

## When Not To Use It

If you do not want to enforce whether Mocha interface methods come from globals or named `mocha` imports, then you can leave this rule disabled.
