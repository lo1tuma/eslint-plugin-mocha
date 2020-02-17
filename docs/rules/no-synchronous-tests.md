# Disallow Synchronous Tests (no-synchronous-tests)

Mocha automatically determines whether a test is synchronous or asynchronous based on the arity of the function passed into it. When writing tests for an asynchronous function, omitting the `done` callback or forgetting to return a promise can often lead to false-positive test cases. This rule warns against the implicit synchronous feature, and should be combined with `handle-done-callback` for best results.

## Rule Details

By default, this rule looks for the presence of one of:

- An asynchronous callback.
- An async function provided to a mocha test statement.
- A return statement within the function body of any mocha test statement.

If none of these three alternatives is used in a test method, the rule will raise a warning.

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

You can change the acceptable asynchronous test methods to only allow a combination of async functions/callbacks/promises:

```js
rules: {
   "mocha/no-synchronous-tests": ["warn", {allowed: ['async', 'callback', 'promise']}]
},
```

### Caveats:

This rule cannot guarantee that a returned function call is actually a promise, it only confirms that the return was made.

If a dynamic function is passed into the test call, it cannot be inspected because the function is only defined at runtime. Example:

```js
var myTestFn = function(){
  // it cannot verify this
}
it('test name', myTestFn);
```

## When Not To Use It

* If you are primarily writing synchronous tests, and rarely need the `done` callback, promise functionality or async functions.

## Further Reading

* [Synchronous Code](http://mochajs.org/#synchronous-code)
* [Asynchronous Code](http://mochajs.org/#asynchronous-code)
* [Working with Promises](http://mochajs.org/#working-with-promises)
