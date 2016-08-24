# Disallow hooks for a single test or test suite (no-hooks-for-single-case)

Mocha proposes hooks that allow code to be run before or after every or all tests. This helps define a common setup or teardown process for every test. These hooks are not useful when there is only one test case, as it would then make more sense to move the hooks' operations in the test directly.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach` and reports them if they are called when there is less than two tests and/or tests suites in the same test suite.

The following patterns are considered warnings:

```js
describe('foo', function () {
    before(function () { /* ... */ }); // Not allowed as there is only a test suite next to this hook.

    describe('bar', function() {
      /* ... */
    });
});

describe('foo', function () {
    after(function () { /* ... */ }); // Not allowed as there is only a test case next to this hook.

    it('should XYZ', function() {
      /* ... */
    });
});

describe('foo', function () {
    beforeEach(function () { /* ... */ }); // Not allowed as there is no test suites or cases next to this hook.
});
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    before(function () { /* ... */ });

    it('should XYZ', function() {
      /* ... */
    });

    it('should ABC', function() {
      /* ... */
    });
});

describe('foo', function () {
    before(function () { /* ... */ });

    it('should XYZ', function() {
      /* ... */
    });

    describe('bar', function() {
      /* ... */
    });
});
```

# Options

This rule supports the following options:

* `allow`: An array containing the names of hooks to allow. This might be used to allow writing `after` hooks to run clean-up code. Defaults to an empty array.

```json
{
    "rules": {
        "mocha/no-hooks-for-single-case": ["error", {"allow": ["after"]}]
    }
}
```

## When Not To Use It

* If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
* If you turned `no-hooks` on, you should turn this rule off, because it would raise several warnings for the same root cause.
