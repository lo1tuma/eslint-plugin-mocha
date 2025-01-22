# Enforces handling of callbacks for async tests (`mocha/handle-done-callback`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

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
it('foo', function (done) {});

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
it('foo', function (done) {
    done();
});

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

## Options

This rule supports the following options:

- `ignorePending`: When set to `true` skipped test cases won’t be checked. Defaults to `false`.

```json
{
    "rules": {
        "mocha/handle-done-callback": ["error", { "ignorePending": true }]
    }
}
```

## When Not To Use It

If you don’t write asynchronous tests you can safely disable this rule.

## Further Reading

- [Asynchronous test code](http://mochajs.org/#asynchronous-code)
