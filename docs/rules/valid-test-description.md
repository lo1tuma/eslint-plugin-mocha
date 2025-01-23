# Require test descriptions to match a pre-configured regular expression (`mocha/valid-test-description`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces the test descriptions to follow the desired format.

## Rule Details

By default, the regular expression is configured to be `"^should"` which requires test descriptions to start with "should".

## Options

Example of a custom rule configuration:

```js
rules: {
    "mocha/valid-test-description": ["warn", { pattern: "mypattern$", message: 'custom error message' }]
},
```

where:

- `warn` is a rule error level (see [Configuring Rules](http://eslint.org/docs/user-guide/configuring#configuring-rules))
- `mypattern$` is a custom regular expression pattern to match test names against
- `custom error message` a custom error message to describe your pattern

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
