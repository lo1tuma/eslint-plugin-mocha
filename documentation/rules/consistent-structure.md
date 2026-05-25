# Require consistent structure for Mocha test entities (`mocha/consistent-structure`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

This rule enforces a consistent arrangement of direct Mocha children within a suite body, and can also enforce duplicate-hook restrictions at the root level. For this rule, "structure" means the order and combination of direct hooks, test cases, and child suites. It does not check whitespace or formatting.

## Rule Details

This rule can enforce:

- a specific order for hooks, test cases, and child suites
- a specific order for recognized hook phases
- that duplicate hook names are not used at the same direct level
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

describe('root', function () {
    beforeEach(function () {});
    beforeEach(function () {});
});

describe('root', function () {
    afterEach(function () {});
    beforeEach(function () {});
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
    before(function () {});
    beforeEach(function () {});
    afterEach(function () {});
    after(function () {});
});

describe('root', function () {
    beforeEach(function () {});
    describe('nested', function () {});
    describe('other nested', function () {});
});

before(function () {});
beforeEach(function () {});
```

## Options

This rule supports the following options:

- `order`: Controls the required order of direct Mocha children. Use `"hooks-tests-suites"` to require hooks before test cases and test cases before child suites. Defaults to `"off"`.
- `hookOrder`: Controls the required order of recognized hook phases. Use `"setup-teardown"` to require `before` or `suiteSetup` hooks before `beforeEach` or `setup`, then `afterEach` or `teardown`, then `after` or `suiteTeardown`. This check uses the terminal hook name, so custom hooks with other names are ignored. Defaults to `"off"`.
- `disallowDuplicateHooks`: Reports duplicate hook names at the same direct level. This also applies to top-level hooks. Defaults to `false`.
- `disallowMixedTestsAndSuites`: Reports suites that contain both direct test cases and direct child suites. Hooks do not count towards this mix. Defaults to `false`.

```json
{
    "rules": {
        "mocha/consistent-structure": ["error", {
            "disallowDuplicateHooks": true,
            "order": "hooks-tests-suites",
            "hookOrder": "setup-teardown",
            "disallowMixedTestsAndSuites": true
        }]
    }
}
```

## When Not To Use It

If your project intentionally mixes direct tests and direct child suites, if duplicate sibling hooks are acceptable, or if you do not care about consistent direct-child or hook ordering inside suites.
