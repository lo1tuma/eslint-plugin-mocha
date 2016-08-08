# Disallow duplicate uses of a hook at the same level inside a describe (no-sibling-hooks)

Mocha proposes hooks that allow code to be run before or after every or all tests. This helps define a common setup or teardown process for every test.
It is possible to declare a hook multiple times inside the same test suite, but it can be confusing. It is better to have one hook handle the whole of the setup or teardown logic of the test suite.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach` and reports them if they are called at least twice inside of a test suite at the same level.

The following patterns are considered warnings:

```js
describe('foo', function () {
    var mockUser;
    var mockLocation;

    before(function () { // Is allowed this time
        mockUser = {age: 50};
    });

    before(function () { // Duplicate! Is not allowed this time
        mockLocation = {city: 'New York'};
    });

    // Same for the other hooks
    after(function () {});
    after(function () {}); // Duplicate!

    beforeEach(function () {});
    beforeEach(function () {}); // Duplicate!

    afterEach(function () {});
    afterEach(function () {}); // Duplicate!
});
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    var mockUser;
    var mockLocation;

    before(function () { // Is allowed this time
        mockUser = {age: 50};
        mockLocation = {city: 'New York'};
    });

    describe('bar', function () {
      before(function () { // Is allowed because it's nested in a new describe
        // ...
      });
    });
});
```

## When Not To Use It

* If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
* If you turned `no-hooks` on, you should turn this rule off, because it would raise several warnings for the same root cause.
