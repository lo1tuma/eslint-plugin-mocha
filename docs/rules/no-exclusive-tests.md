# Disallow Exclusive Tests (no-exclusive-tests)

Mocha has a feature that allows you to run tests exclusively by appending `.only` to a test-suite or a test-case.
This feature is really helpful to debug a failing test, so you don’t have to execute all of your tests.
After you have fixed your test and before committing the changes you have to remove `.only` to ensure all tests are executed on your build system.

This rule reminds you to remove `.only` from your tests by raising a warning whenever you are using the exclusivity feature.

## Rule Details

This rule looks for every `describe.only`, `it.only`, `suite.only`, `test.only`, `context.only` and `specify.only`occurrences within the source code.
Of course there are some edge-cases which can’t be detected by this rule e.g.:

```js
var describeOnly = describe.only;
describeOnly.apply(describe);
```

The following patterns are considered warnings:

```js
// bdd
describe.only("foo", function () {});
it.only("foo", function () {});
describe["only"]("bar", function () {});
it["only"]("bar", function () {});

// tdd
suite.only("foo", function () {});
test.only("foo", function () {});
suite["only"]("bar", function () {});
test["only"]("bar", function () {});

```

These patterns would not be considered warnings:

```js
// bdd
describe("foo", function () {});
it("foo", function () {});
describe.skip("bar", function () {});
it.skip("bar", function () {});

// tdd
suite("foo", function () {});
test("foo", function () {});
suite.skip("bar", function () {});
test.skip("bar", function () {});
```

# Options

This rule supports the following shared configuration options:

* `additionalTestFunctions`: An array of extra test functions to protect.  This might be used with a custom Mocha extension, such as [`ember-mocha`](https://github.com/switchfly/ember-mocha)

```json
{
    "rules": {
        "mocha/no-exclusive-tests": "error"
    },
    "settings": {
       "mocha/additionalTestFunctions": [
           "describeModule"
       ]
    }
}
```

## When Not To Use It

* If you really want to execute only one test-suite or test-case because all other tests should not be executed, turn this rule off.
* If you use another library which exposes a similar API as mocha (e.g. `describe.only`), you should turn this rule off, because it would raise warnings.

## Further Reading

* [Exclusive Tests](http://mochajs.org/#exclusive-tests)
