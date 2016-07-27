# Disallow hooks (no-hooks)

Mocha proposes hooks that allow code to be run before or after every or all tests. This helps define a common setup or teardown process for every test. The use of these hooks promotes the use of shared state between the tests, and defeats the purpose of having isolated unit tests.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach`.

The following patterns are considered warnings:

```js
describe('foo', function () {
    var mockUser;

    before(function () { // Not allowed
        mockUser = {age: 50};
    });

    after(function () { /* ... */ }); // Not allowed
    beforeEach(function () { /* ... */ }); // Not allowed
    afterEach(function () { /* ... */ }); // Not allowed

    it(function () {
        assert.equals(lib.method(mockUser), 'expectedValue');
    });
});
```

These patterns would not be considered warnings:

```js
function createFixtures() {
    return {
        mockUser: {age: 50}
    };
}

describe('foo', function () {
    it(function () {
        var fixtures = createFixtures();
        assert.equals(lib.method(fixtures.mockUser), 'expectedValue');
    });
});
```

## When Not To Use It

* If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
