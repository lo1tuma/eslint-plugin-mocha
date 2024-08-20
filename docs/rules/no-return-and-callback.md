# Disallow returning in a test or hook function that uses a callback (`mocha/no-return-and-callback`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha's tests or hooks (like `before`) may be asynchronous by either returning a Promise or specifying a callback parameter for the function. It can be confusing to have both methods used in a test or hook, and from Mocha v3 on, causes the test to fail in order to force developers to remove this source of confusion.

## Rule Details

This rule looks for every test and hook (`before`, `after`, `beforeEach` and `afterEach`) and reports when the function takes a parameter and returns a value. Returning a non-Promise value is fine from Mocha's perspective, though it is ignored, but helps the linter catch more error cases.

The following patterns are considered warnings:

```js
describe('suite', function () {
    before('title', function (done) {
        return foo(done);
    });

    it('title', function (done) {
        return bar().then(function () {
            done();
        });
    });
});
```

These patterns would not be considered warnings:

```js
describe('suite', function () {
    before('title', function (done) {
        foo(done);
    });

    it('title', function () {
        return bar();
    });
});
```

## When Not To Use It

- If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
