# Padding Between Test Functions (padding-between-test-functions)

This is a stylistic rule that enforces consistent empty line padding before and after mocha functions.

**Fixable:** Problems detected by this rule are automatically fixable using the `--fix` flag on the command line.

## Rule Details

This rule looks for every call to  `describe`, `context`, `it`, `specify`, `before`,  `after`, `beforeEach`, `afterEach`, `suite`, `test`, `suiteSetup`, `suiteTeardown`, `setup`, `teardown` and will ensure consistent spacing between it and the nearest token.

## Options

This rule has one option:

* `"always"` (default) requires empty lines at the beginning and ending of test functions
* `"never"` disallows empty lines at the beginning and ending of test functions

### always

Examples of **incorrect** code for this rule with the default `"always"` option:

```js
describe(function() {
    beforeEach(function(){});
    afterEach(function(){});
    it('', function() {});
});
```

Examples of **correct** code for this rule with the default `"always"` option:

```js
describe(function() {

    beforeEach(function(){});

    afterEach(function(){});

    it('', function() {});

});
```

### never

Examples of **incorrect** code for this rule with the `"never"` option:

```js
describe(function() {

    beforeEach(function(){});

    afterEach(function(){});

    it('', function() {});

});
```

Examples of **correct** code for this rule with the `"never"` option:

```js
describe(function() {
    beforeEach(function(){});
    afterEach(function(){});
    it('', function() {});
});
```

## When Not To Use It

You can turn this rule off if you are not concerned with the consistency of padding between test functions.
