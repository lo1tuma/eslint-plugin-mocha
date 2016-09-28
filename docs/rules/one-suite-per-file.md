# Disallow multiple top-level suites in a single file (one-suite-per-file)

This rule enforces having a single top-level suite in a file.

Multiple `describe` blocks is often a sign that a test should be broken down to multiple files.
One of the possible problems if having multiple suites is that, if you are, for example, going through tests one by one and focusing them (using `fdescribe`), you might not notice `describe` block(s) that are down there at the bottom of a file which may lead to tests being unintentionally skipped.

## Rule Details

By default, the rule supports "describe", "context" and "suite" suite function names, but it can be configured to look for different suite names via rule configuration.

The following patterns are considered warnings:

```js
describe('foo', function () {
    it('should do foo', function() {});
});

describe('bar', function() {
    it('should do bar', function() {});
});
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    it('should do foo', function() {});

    describe('bar', function() {
        it('should do bar', function() {});
    });
});
```

There is also possible to configure a custom list of suite names via the second rule configuration option:

```js
rules: {
   "mocha/one-suite-per-file": [["describe", "context", "suite", "mysuitename"]]
},
```
