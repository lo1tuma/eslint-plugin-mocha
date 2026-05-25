# Disallow conditional suite and test declarations (`mocha/no-conditional-tests`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Conditionally declaring suites or test cases makes the executed test structure depend on runtime state. That makes the suite harder to understand and easier to accidentally change.

## Rule Details

This rule reports Mocha suite and test declarations inside:

- `if` statements
- logical short-circuit expressions such as `condition && it(...)`
- conditional expressions such as `condition ? it(...) : test(...)`

The following patterns are considered problems:

```js
if (condition) {
    it('works', function () {});
}

condition && describe('suite', function () {});

condition ? it('left', function () {}) : it('right', function () {});
```

These patterns would not be considered problems:

```js
describe('suite', function () {
    it('works', function () {});
});

it('works', function () {
    if (condition) {
        doWork();
    }
});

if (condition) {
    beforeEach(function () {});
}
```

## When Not To Use It

If your project intentionally declares suites or test cases conditionally.
