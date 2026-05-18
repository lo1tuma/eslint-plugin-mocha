# Disallow exports from test files (`mocha/no-exports`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Test files should stay focused on tests. If a test file also exports values, it often means helper or library code should move to a separate file.

## Rule Details

This rule flags ESM export statements when the same file also uses a Mocha function.

The following patterns are considered warnings:

```js
beforeEach(function () {/* ... */});
export default 'foo';

afterEach(function () {/* ... */});
export const foo = 'bar';
```

These patterns would not be considered warnings:

```js
describe(function () {/* ... */});

it('works', function () {/* ... */});

beforeEach(function () {/* ... */});

afterEach(function () {/* ... */});
```

## When Not To Use It

Do not use this rule with Mocha's [`exports` interface](https://mochajs.org/#exports).
