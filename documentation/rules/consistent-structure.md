# Require consistent structure for Mocha test entities (`mocha/consistent-structure`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces a consistent arrangement of direct Mocha children within a suite body. For this rule, "structure" means the order and combination of direct hooks, test cases, and child suites. It does not check whitespace or formatting.

## Rule Details

This rule can enforce:

- a specific order for hooks, test cases, and child suites
- that direct test cases and direct child suites are not mixed in the same suite

The following patterns are considered warnings:

```js
describe('root', function () {
    it('works', function () {});
    beforeEach(function () {});
});

describe('root', function () {
    describe('nested', function () {});
    it('works', function () {});
});

describe('root', function () {
    it('a', function () {});
    describe('nested', function () {});
});
```

These patterns would not be considered warnings:

```js
describe('root', function () {
    beforeEach(function () {});
    it('works', function () {});
    it('works again', function () {});
});

describe('root', function () {
    beforeEach(function () {});
    describe('nested', function () {});
    describe('other nested', function () {});
});
```

## Options

This rule supports the following options:

- `order`: Controls the required order of direct Mocha children. Use `"hooks-tests-suites"` to require hooks before test cases and test cases before child suites. Defaults to `"off"`.
- `disallowMixedTestsAndSuites`: Reports suites that contain both direct test cases and direct child suites. Hooks do not count towards this mix. Defaults to `false`.

```json
{
    "rules": {
        "mocha/consistent-structure": ["error", {
            "order": "hooks-tests-suites",
            "disallowMixedTestsAndSuites": true
        }]
    }
}
```

## When Not To Use It

If your project intentionally mixes direct tests and direct child suites, or if you do not care about a consistent sibling order inside suites.
