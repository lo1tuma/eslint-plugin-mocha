# Disallow returning from an async test or hook (no-return-from-async)

Mocha's tests or hooks (like `before`) may be asynchronous by returning a Promise. When such a Promise-returning function is defined using [an ES7 `async` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) it can be confusing when combined with an explicit `return` of a Promise, as it's mixing the two styles.

## Rule Details

This rule looks for every test and hook (`before`, `after`, `beforeEach` and `afterEach`) and reports when the function is async and returns a value. Returning a non-Promise value is fine from Mocha's perspective, though it is ignored, but helps the linter catch more error cases.

The following patterns are considered warnings:

```js
describe('suite', function () {
    before('title', async function() {
        return foo;
    });

    it('title', async function() {
        return bar().then(function() {
            quux();
        });
    });
});
```

These patterns would not be considered warnings:

```js
describe('suite', function () {
    before('title', async function() {
        await foo();
    });

    it('title', function() {
        if (bailEarly) {
            return;
        }
        await bar();
    });
});
```

## When Not To Use It

* If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
