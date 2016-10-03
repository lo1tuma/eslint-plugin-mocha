# Match test descriptions against a pre-configured regular expression (valid-test-description)

This rule enforces the test descriptions to follow the desired format. 

## Rule Details

By default, the regular expression is configured to be "^should" which requires test descriptions to start with "should". 
By default, the rule supports "it", "specify" and "test" test function names, but it can be configured to look for different test names via rule configuration.

Example of a custom rule configuration:

```js
   rules: {
       "mocha/valid-test-description": ["warning", "mypattern$", ["it", "specify", "test", "mytestname"]]
   },
```

where:

 * `warning` is a rule error level (see [Configuring Rules](http://eslint.org/docs/user-guide/configuring#configuring-rules))
 * `mypattern$` is a custom regular expression pattern to match test names against
 * `["it", "specify", "test", "mytestname"]` is an array of custom test names 

The following patterns are considered warnings (with the default rule configuration):

```js
// bdd
it("does something", function() { });
specify("does something", function() { });

// tdd
test("does something", function() { });
```

These patterns would not be considered warnings:

```js
// bdd
it("should respond to GET", function() { });
it("should do something");
specify("should respond to GET", function() { });
specify("should do something");

// tdd
test("should respond to GET", function() { });
test("should do something");
```
