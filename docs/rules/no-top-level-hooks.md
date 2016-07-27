# Disallow top-level hooks (no-top-level-hooks)

Mocha proposes hooks that allow code to be run before or after every or all tests. This helps define a common setup or teardown process for every test.
These hooks should only be declared inside test suites, as they would otherwise be run before or after every test or test suite of the project, even if the test suite of the file they were declared in was skipped. This can lead to very confusing and unwanted effects.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach` that are not in a test suite.

The following patterns are considered warnings:

```js
before(function () { /* ... */ }); // Not allowed
after(function () { /* ... */ }); // Not allowed
beforeEach(function () { /* ... */ }); // Not allowed
afterEach(function () { /* ... */ }); // Not allowed
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    before(function () { /* ... */ });
    after(function () { /* ... */ });
    beforeEach(function () { /* ... */ });
    afterEach(function () { /* ... */ });
});
```

## When Not To Use It

* If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
* If you turned `no-hooks` on, you should turn this rule off, because it would raise several warnings for the same root cause.
