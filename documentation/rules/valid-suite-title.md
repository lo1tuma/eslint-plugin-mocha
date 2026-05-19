# Require suite descriptions to match a pre-configured regular expression (`mocha/valid-suite-title`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces a naming pattern for suite titles.

## Rule Details

This rule has no default pattern. If you enable it, configure `pattern`.

Example of a custom rule configuration:

```js
rules: {
   "mocha/valid-suite-title": ["warn", { pattern: "^[A-Z]", message: 'custom error message' }]
},
```

- `pattern` is the regular expression used to validate suite titles
- `message` is the custom error message shown when a title does not match

The following patterns are considered warnings with the example configuration above:

```js
// bdd
describe('something to test', function () {});
context('something to test', function () {});

// tdd
suite('something to test', function () {});
```

These patterns would not be considered warnings:

```js
// bdd
describe('Test suite', function () {});
context('Test suite', function () {});

// tdd
suite('Test suite', function () {});
```

## Options

This rule supports two options:

- `pattern`: A regular expression.
- `message`: A custom error message.

```js
rules: {
   "mocha/valid-suite-title": ["warn", { pattern: "^[A-Z]", message: "custom error message" }]
},
```
