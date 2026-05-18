# Require test descriptions to match a pre-configured regular expression (`mocha/valid-test-title`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces a naming pattern for test titles.

## Rule Details

By default, the pattern is `"^should"`, so test titles must start with `should`.

## Options

Example of a custom rule configuration:

```js
rules: {
    "mocha/valid-test-title": ["warn", { pattern: "mypattern$", message: 'custom error message' }]
},
```

- `pattern` is the regular expression used to validate test titles
- `message` is the custom error message shown when a title does not match

The following patterns are considered warnings (with the default rule configuration):

```js
// bdd
it('does something', function () {});
specify('does something', function () {});

// tdd
test('does something', function () {});
```

These patterns would not be considered warnings:

```js
// bdd
it('should respond to GET', function () {});
it('should do something');
specify('should respond to GET', function () {});
specify('should do something');

// tdd
test('should respond to GET', function () {});
test('should do something');
```
