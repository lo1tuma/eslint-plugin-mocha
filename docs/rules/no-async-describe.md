# Disallow async functions passed to describe (no-async-describe)

This rule disallows the use of an async function with `describe`. It usually indicates a copy/paste error or that you're trying to use `describe` for setup code, which should happen in `before` or `beforeEach`. Also, it can lead to [the contained `it` blocks not being picked up](https://github.com/mochajs/mocha/issues/2975).

Example:

```js
describe('the thing', async function () {
    // This work should happen in a beforeEach:
    const theThing = await getTheThing();

    it('should foo', function () {
        // ...
    });
});
```

**Fixable:** Problems detected by this rule are automatically fixable using the `--fix` flag on the command line.

## Rule Details

The rule supports "describe", "context" and "suite" suite function names and different valid suite name prefixes like "skip" or "only".

The following patterns are considered problems, whether or not the function uses `await`:

```js
describe('something', async function () {
    it('should work', function () {});
});

describe('something', async () => {
    it('should work', function () {});
});
```

If the `describe` function does not contain `await`, a fix of removing `async` will be suggested.

The rule won't be able to detect the (hopefully uncommon) cases where the async
function is defined before the `describe` call and passed by reference:

```js
async function mySuite() {
    it('my test', () => {});
}

describe('my suite', mySuite);
```

## When Not To Use It

- If you use another library which exposes a similar API as mocha, you should turn this rule off because it would raise warnings.
- In environments that have not yet adopted ES6 language features (ES3/5).
