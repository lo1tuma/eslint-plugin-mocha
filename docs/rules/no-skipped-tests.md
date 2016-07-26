# Disallow Skipped Tests (no-skipped-tests)

Mocha has a feature that allows you to skip tests by appending `.skip` to a test-suite or a test-case, or by prepending it with an `x` (e.g., `xdescribe(...)` instead of `describe(...)`).
Sometimes tests are skipped as part of a debugging process, and aren't intended to be committed.  This rule reminds you to remove `.skip` or the `x` prefix from your tests.

**Fixable:** Problems detected by this rule are automatically fixable using the `--fix` flag on the command line.

## Rule Details

This rule looks for `describe.skip`, `it.skip`, `suite.skip`, `test.skip`, `context.skip`, `specify.skip`, `xdescribe`, `xit`, `xcontext` and `xspecify` occurrences within the source code.

The following patterns are considered warnings:

```js
// bdd
describe.skip("foo", function () {});
it.skip("foo", function () {});
describe["skip"]("bar", function () {});
it["skip"]("bar", function () {});
xdescribe("baz", function() {});
xit("baz", function() {});

// tdd
suite.skip("foo", function () {});
test.skip("foo", function () {});
suite["skip"]("bar", function () {});
test["skip"]("bar", function () {});

```

These patterns would not be considered warnings:

```js
// bdd
describe("foo", function () {});
it("foo", function () {});
describe.only("bar", function () {});
it.only("bar", function () {});

// tdd
suite("foo", function () {});
test("foo", function () {});
suite.only("bar", function () {});
test.only("bar", function () {});
```

# Options

This rule supports the following shared configuration options:

* `additionalTestFunctions`: An array of extra test functions to protect.  This might be used with a custom Mocha extension, such as [`ember-mocha`](https://github.com/switchfly/ember-mocha)
* `additionalXFunctions`: An array of extra x-function to protect

```json
{
    "rules": {
        "mocha/no-skipped-tests": "error"
    },
    "settings": {
       "mocha/additionalTestFunctions": [
           "describeModule"
       ],
       "mocha/additionalXFunctions": [
           "xdescribeModule"
       ]
    }
}
```
## When Not To Use It

* If you really want to commit skipped tests to your repo, turn this rule off.
* If you use another library which exposes a similar API to mocha (e.g. `describe.skip` or `xdescribe`), you should turn this rule off, because it would raise warnings.

## Further Reading

* [Exclusive Tests](http://mochajs.org/#inclusive-tests)
