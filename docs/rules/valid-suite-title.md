# Require suite descriptions to match a pre-configured regular expression (`mocha/valid-suite-title`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces the suite descriptions to follow the desired format.

## Rule Details

By default, the regular expression is not configured and would be required if rule is enabled.

Example of a custom rule configuration:

```js
rules: {
   "mocha/valid-suite-title": ["warn", { pattern: "^[A-Z]", message: 'custom error message' }]
},
```

where:

- `warn` is a rule error level (see [Configuring Rules](http://eslint.org/docs/user-guide/configuring#configuring-rules))
- `^[A-Z]` is a custom regular expression pattern to match suite names against; `^[A-Z]` enforces a suite name to start with an upper-case letter

The following patterns are considered warnings (with the example rule configuration posted above):

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

There is also possible to configure a custom list of suite names and a custom error message via the second and third rule configuration option:

```js
rules: {
   "mocha/valid-suite-title": ["warn", "^[A-Z]", ["describe", "context", "suite", "mysuitename"], "custom error message"]
},
// OR
rules: {
   "mocha/valid-suite-title": ["warn", { pattern: "^[A-Z]", suiteNames: ["describe", "context", "suite", "mysuitename"], message: "custom error message" }]
},
```
