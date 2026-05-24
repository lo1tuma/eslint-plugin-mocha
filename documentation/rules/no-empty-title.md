# Disallow empty suite and test descriptions (`mocha/no-empty-title`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces non-empty descriptions for Mocha suites and test cases.

## Rule Details

This rule checks suite and test descriptions when they can be evaluated statically.

The following patterns are considered problems:

```js
describe();

describe('   ', function () {});

it();

suite('');

test(function () {});

test.only(' ', function () {});
```

These patterns would not be considered problems:

```js
describe('foo', function () {
    it('bar');
});

suite('foo', function () {
    test('bar');
});

const dynamicTitle = getTitle();
it(dynamicTitle, function () {});
```

## Options

This rule accepts one optional object:

- `message`: a custom error message to use instead of the default message

Example:

```js
rules: {
    "mocha/no-empty-title": [ "warn", {
        message: 'custom error message'
    } ]
}
```
