# Enforces handling of callbacks for async tests (`mocha/handle-done-callback`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets you write asynchronous tests by accepting a `done` callback. Forgetting to call it usually means the test times out.

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

In this example, the `done` callback is never called, so the test times out.

## Rule Details

This rule checks functions passed to `it`, `test`, `specify`, and the standard Mocha hooks.

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

This rule supports one option:

- `ignorePending`: When `true`, skipped test cases are ignored. Default: `false`.

```json
{
    "rules": {
        "mocha/handle-done-callback": ["error", { "ignorePending": true }]
    }
}
```

## When Not To Use It

If you do not write asynchronous tests, you can disable this rule.

## Further Reading

- [Asynchronous code](https://mochajs.org/#asynchronous-code)
