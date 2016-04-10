# Enforces handling of callbacks for async tests (handle-done-callback)

Mocha allows you to write asynchronous tests by adding a `done` callback to the parameters of your test function.
It is easy to forget calling this callback after the asynchronous operation is done.

Example:

```js

it('should work', function (done) {
    fetchData(options, function (error, data) {
        expect(error).not.to.be.ok;
        expect(data).to.deep.equal({ foo: 'bar' });
        // done callback was not called
    });
});
```

In this example the `done` callback was never called and test will time out.

## Rule Details

This rule checks each `FunctionExpression` or `ArrowFunctionExpression` inside of `it`, `it.only`, `test`, `test.only`, `specify`, `specify.only`, `before`, `after`, `beforeEach` and `afterEach`.

The following patterns are considered warnings:

```js
it('foo', function (done) { });

it('foo', function (done) {
    asyncFunction(function (err, result) {
        expect(err).to.not.exist;
    });
});

before(function (done) {
    asyncInitialization(function () {
        initialized = true;
    });
});
```

These patterns would not be considered warnings:

```js
it('foo', function (done) { done(); });

it('foo', function (done) {
    asyncFunction(function (err, result) {
        expect(err).to.not.exist;
        done();
    });
});

before(function (done) {
    asyncInitialization(function () {
        initialized = true;
        done();
    });
});
```

## When Not To Use It

If you don’t write asynchronous tests you can safely disable this rule.

## Further Reading

* [Asynchronous test code](http://mochajs.org/#asynchronous-code)
