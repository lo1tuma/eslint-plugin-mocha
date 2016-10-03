# Limit the number of top-level suites in a single file (max-top-level-suites)

This rule enforces having a limited amount of top-level suites in a file - by default a single suite per file is allowed.

Multiple `describe` blocks is often a sign that a test should be broken down to multiple files.
One of the possible problems if having multiple suites is that, if you are, for example, going through tests one by one and focusing them (using `describe.only`), you might not notice `describe` block(s) that are down there at the bottom of a file which may lead to tests being unintentionally skipped.

## Rule Details

The rule supports "describe", "context" and "suite" suite function names and different valid suite name prefixes like "skip" or "only".

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

If you want to change the suite limit to, for instance, 2 suites per file:

```js
rules: {
   "mocha/max-top-level-suites": ["warning", {limit: 2}]
},
```
