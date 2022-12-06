# Disallow exports from test files (`mocha/no-exports`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Test files should have only one purpose, which is testing a specific unit. Using exports could mean the test file is also used to provide and expose utility or library functionalities, instead those should be moved to separate files.

## Rule Details

This rule looks for CommonJS or ESM export statements and flags them as a problem when the same file also contains a use of a mocha function.

The following patterns are considered warnings:

```js
describe(function () { /* ... */ });
module.exports = 'foo';

it('works', function () { /* ... */ });
exports.foo = 'bar';

beforeEach(function () { /* ... */ });
export default 'foo';

afterEach(function () { /* ... */ });
export const foo = 'bar';
```

These patterns would not be considered warnings:

```js
describe(function () { /* ... */ });

it('works', function () { /* ... */ });

beforeEach(function () { /* ... */ });

afterEach(function () { /* ... */ });
```

## When Not To Use It

When you use the [`exports`](https://mochajs.org/#exports) interface it is not recommended to use this rule.
