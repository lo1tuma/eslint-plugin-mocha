# Disallow async functions passed to describe (no-async-describe)

This rule disallows the use of an async function with `describe`. It usually indicates a copy/paste error or that you're trying to use `describe` for setup code, which should happen in `before` or `beforeEach`. Also, it can lead to [the contained `it` blocks not being picked up](https://github.com/mochajs/mocha/issues/2975).

Example:

```js
describe(async function () {
    // This work should happen in a beforeEach:
    const theThing = await getTheThing();

    it('should foo', function () {
        // ...
    });
});
```

## Rule Details

The rule supports "describe", "context" and "suite" suite function names and different valid suite name prefixes like "skip" or "only".

The following patterns are considered problems, whether or not the function uses `await`:

```js
describe'something', async function () {
    it('should work', function () {});
});

describe'something', async () => {
    it('should work', function () {});
});
```

If the `describe` function does not contain `await`, a fix of removing `async` will be suggested.

This rule looks for every `describe.only`, `it.only`, `suite.only`, `test.only`, `context.only` and `specify.only` occurrences within the source code.
Of course there are some edge-cases which can’t be detected by this rule, eg.:

```js
var describeOnly = describe.only;
describeOnly.apply(describe);
```

## When Not To Use It

- If you use another library which exposes a similar API as mocha (e.g. `describe.only`), you should turn this rule off because it would raise warnings.
- In environments that have not yet adopted ES6 language features (ES3/5).
