# Disallow Synchronous Tests (no-synchronous-tests)

Mocha automatically determines whether a test is synchronous or asynchronous based on the arity of the function passed into it. When writing tests for a asynchronous function, omitting the `done` callback or forgetting to return a promise can often lead to false-positive test cases. This rule warns against the implicit synchronous feature, and should be combined with `handle-done-callback` for best results.

## Rule Details

This rule looks for either an asynchronous callback or a return statement within the function body of any mocha test statement. If the mocha callback is not used and a promise is not returned, this rule will raise a warning.

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

* If you are primarily writing synchronous tests, and rarely need the `done` callback or promise functionality.

## Further Reading

* [Synchronous Code](http://mochajs.org/#synchronous-code)
* [Asynchronous Code](http://mochajs.org/#asynchronous-code)
* [Working with Promises](http://mochajs.org/#working-with-promises)
