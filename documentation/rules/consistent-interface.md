# Enforces consistent use of mocha interfaces (`mocha/consistent-interface`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha has several interfaces such as `BDD`, `TDD`, `Exports`, `QUnit` etc. Usually Mocha injects the variables and functions of the selected interface into the global scope. When using the `Exports` interface, named imports from `mocha` are used instead. This rule enforces a consistent `BDD` or `TDD` interface for imported Mocha interface methods, and it also reports imported Mocha interface methods when `settings.mocha.interface` is configured for globals.

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

With `settings.mocha.interface: "exports"`, this rule enforces that imported Mocha interface methods all belong to the configured `BDD` or `TDD` interface.

With `settings.mocha.interface: "BDD"` or `settings.mocha.interface: "TDD"`, this rule reports named imports of Mocha interface methods from `mocha`, because those imports indicate `exports`-style usage and can prevent other rules from recognizing Mocha calls.

## When Not To Use It

If you do not want to enforce whether Mocha interface methods come from globals or named `mocha` imports, then you can leave this rule disabled.
