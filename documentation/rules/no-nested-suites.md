# Disallow suites to be nested within other suites (`mocha/no-nested-suites`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Nested suites are a valid Mocha pattern, but some projects prefer flatter files where each suite stays at the top level.

## Rule Details

This rule reports suite calls inside another suite. It applies to all supported suite names, including configured custom suite names.

The following patterns are considered warnings:

```js
describe('root', function () {
    describe('nested', function () {});
});

suite('root', function () {
    suite('nested', function () {});
});
```

These patterns would not be considered warnings:

```js
describe('root', function () {
    it('works', function () {});
});

describe('first', function () {});
describe('second', function () {});
```

## When Not To Use It

If your project uses nested suites to structure tests, or if `mocha/consistent-structure` already expresses the level of nesting discipline you want.
