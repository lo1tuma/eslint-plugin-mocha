# Disallow global tests (no-global-tests)

Mocha gives you the possibility to structure your tests inside of suites using `describe`, `suite` or `context`.

Example:

```js
describe('something', function () {
    it('should work', function () {});
});
```

This rule aims to prevent writing tests outside of test-suites:

```js
it('should work', function () {});
```

## Rule Details

This rule checks each mocha test function to not be located directly in the global scope.

The following patterns are considered problems:

```js
it('foo');

test('bar');

it.only('foo');

test.skip('bar');
```

These patterns would not be considered problems:

```js
describe('foo', function () {
    it('bar');
});

suite('foo', function () {
    test('bar');
});
```

## Caveats

It is not always possible to statically detect in which scope a mocha test function will be used at runtime.
For example imagine a parameterized test which is generated inside of a `forEach` callback:

```js
function parameterizedTest(params) {
    params.forEach(function (i) {
        it('should work with ' + i, function () {});
    });
}

parameterizedTest([1,2,3]);
```
