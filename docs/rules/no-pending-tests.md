# Disallow Pending Tests (no-pending-tests)

Mocha allows specification of pending tests, which represent tests that aren't yet implemented, but are intended to be implemented eventually. These are designated like a normal mocha test, but with only the first argument provided (no callback for the actual implementation). For example: `it('unimplemented test');`

This rule allows you to raise ESLint warnings or errors on pending tests. This can be useful, for example, for reminding developers that pending tests exist in the repository, so they're more likely to get implemented.

## Rule Details

This rule looks for `it`, `test`, and `specify` function calls with only one argument, where the argument is a string literal.

The following patterns are considered warnings:

```js
it("foo");
specify("foo");
test("foo");
```

These patterns are not considered warnings:

```js
it("foo", function() {});
specify("foo", function() {});
test("foo", function() {});
```

## When Not To Use It

* If the existence of pending/unimplemented tests isn't considered important enough to warrant raising lint warnings/errors.

## Further Reading

* [Pending Tests](http://mochajs.org/#pending-tests)
