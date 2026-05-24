# Disallow synchronous tests (`mocha/no-synchronous-tests`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha treats a test as asynchronous when it accepts a callback, returns a promise, or uses an `async` function. If none of those are present, Mocha treats the test as synchronous. This rule warns on that implicit synchronous path and works well with `handle-done-callback`.

## Rule Details

By default, this rule looks for one of:

- An asynchronous callback.
- An async function provided to a mocha test statement.
- A `return` statement within the function body of any mocha test statement.

If a test uses none of these patterns, the rule raises a warning.

The following patterns are considered warnings:

```js
it('should do foo', function () {
    return;
});

it('should do foo', function () {
    callback();
});
```

These patterns would not be considered warnings:

```js
it('should do foo', function (done) {
    done();
});

it('should do foo', async function () {
    await something();
});

it('should do foo', function () {
    return promise;
});
```

## Options

You can limit which async styles are allowed:

```js
rules: {
    "mocha/no-synchronous-tests": ["warn", { "allowedAsyncMethods": ["async", "callback", "promise"] }]
},
```

### Caveats

This rule cannot prove that a returned value is really a promise. It only checks that a value is returned.

If a dynamic function is passed into the test call, the rule cannot inspect it because the function is only defined at runtime:

```js
var myTestFn = function () {
    // it cannot verify this
};
it('test name', myTestFn);
```

## When Not To Use It

- If you mainly write synchronous tests.

## Further Reading

- [Synchronous code](https://mochajs.org/#synchronous-code)
- [Asynchronous code](https://mochajs.org/#asynchronous-code)
- [Working with promises](https://mochajs.org/#working-with-promises)
