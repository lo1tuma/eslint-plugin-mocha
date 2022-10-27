# Disallow tests to be nested within other tests (`mocha/no-nested-tests`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Test cases in mocha can be either global or within a suite but they can’t be nested within other tests. Unfortunately there is nothing stopping you from creating a test case within another test case but mocha will simply ignore those tests.

```js
it('something', function () {
    it('should work', function () {
        assert(fasle);
    });
});
```

Something like this could easily happen by accident where the outer test case was actually meant to be a suite instead of a test.
This rule reports such nested test cases in order to prevent problems where those nested tests are skipped silently.

## Rule Details

This rule looks for all test cases (`it`, `specify` and `test`) or suites (`describe`, `context` and `suite`) which are nested within another test case.

The following patterns are considered problems:

```js
it('something', function () {
    it('should work', function () {});
});

test('something', function () {
    specify('should work', function () {});
});

it('something', function () {
    describe('other thing', function () {
        // …
    });
});

```

These patterns would not be considered problems:

```js
it('should work', function () {});
it('should work too', function () {});

describe('something', function () {
    it('should work', function () {});
});
```
