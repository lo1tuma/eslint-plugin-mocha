# mocha/no-root-hooks

📝 Disallow root hooks.

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha calls hooks declared outside a suite [root hooks](https://mochajs.org/features/hooks/#root-level-hooks). They run before or after tests in the root suite, which can be surprising when a file's own suites are skipped.

This rule disallows root hooks and requires hooks to be declared inside a suite.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach` that is not in a test suite.

The following patterns are considered warnings:

```js
before(function () {/* ... */}); // Not allowed
after(function () {/* ... */}); // Not allowed
beforeEach(function () {/* ... */}); // Not allowed
afterEach(function () {/* ... */}); // Not allowed
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    before(function () {/* ... */});
    after(function () {/* ... */});
    beforeEach(function () {/* ... */});
    afterEach(function () {/* ... */});
});
```

## When Not To Use It

- If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
- If you turned `no-hooks` on, you should turn this rule off, because it would raise several warnings for the same root cause.
