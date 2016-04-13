# Disallow Pending Tests (no-pending-tests)

Mocha allows specification of pending tests, which represent tests that aren't yet implemented, but are intended to be implemented eventually. These are designated like a normal mocha test or suite, but with only the first argument provided (no callback for the actual implementation). For example: `describe('unimplemented bdd suite');`

This rule allows you to raise ESLint warnings or errors on pending tests. This can be useful, for example, for reminding developers that pending tests exist in the repository, so they're more likely to get implemented.

## Rule Details

This rule looks for `describe`, `it`, `suite`, `test`, `context`, and `specify` function calls with only one argument, where the argument is a string literal.

The following patterns are considered warnings:

```js
// bdd
describe("foo");
it("foo");

// tdd
suite("foo");
test("foo");
suite("bar");
test("bar");
```

These patterns are not considered warnings:

```js
// bdd
describe("foo", function () {});
it("foo", function () {});

// tdd
suite("foo", function () {});
test("foo", function () {});
```

## When Not To Use It

* If the existence of pending/unimplemented tests isn't considered important enough to warrant raising lint warnings/errors.

## Further Reading

* [Pending Tests](http://mochajs.org/#pending-tests)
