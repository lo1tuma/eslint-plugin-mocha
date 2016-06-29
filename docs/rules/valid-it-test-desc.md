# Check "it()" and "test()" descriptions against a pre-configured regular expression

This rule enforces the "it()" and "test()" descriptions to follow the desired format. 

By default, the regular expression is configured to be "^should" which requires "it()" and "test()" descriptions to start with "should".

## Rule Details

This rule looks for every `it()` and `test()` call expression occurrences within the source code.

The following patterns are considered warnings (with the default rule configuration):

```js
// bdd
it("does something", function() { });

// tdd
test("does something", function() { });
```

These patterns would not be considered warnings:

```js
// bdd
it("should respond to GET", function() { });
it("should do something");

// tdd
test("should respond to GET", function() { });
test("should do something");
```
