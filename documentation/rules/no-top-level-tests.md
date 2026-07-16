# mocha/no-top-level-tests

📝 Disallow top-level tests.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets you structure tests inside suites using `describe`, `suite` or `context`.

Example:

```js
describe('something', function () {
    it('should work', function () {});
});
```

This rule prevents writing tests outside of suites:

```js
it('should work', function () {});
```

## Rule Details

This rule reports Mocha test functions declared outside any suite.

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

parameterizedTest([ 1, 2, 3 ]);
```
