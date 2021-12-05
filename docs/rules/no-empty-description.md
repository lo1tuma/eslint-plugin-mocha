# Disallow empty test descriptions (no-empty-description)

This rule enforces you to specify the suite/test descriptions for each test.

## Rule Details

This rule checks each mocha test function to have a non-empty description.

The following patterns are considered problems:

```js
it();

suite("");

test(function() { })

test.only(" ", function() { })

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

## Options

Example of a custom rule configuration:

```js
   rules: {
       "mocha/no-empty-description": [ "warn", {
           testNames: ["it", "specify", "test", "mytestname"],
           message: 'custom error message'
       } ]
   }
```
