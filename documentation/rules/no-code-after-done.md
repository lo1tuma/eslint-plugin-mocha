# Disallow executing code after calling a Mocha callback (`mocha/no-code-after-done`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Once a callback-style test or hook calls `done()`, Mocha treats that operation as completion. Assertions or side effects that run afterward can be ignored, misreported, or fail in confusing ways.

## Rule Details

Examples of **incorrect** code for this rule:

```js
it('reports too late', function (done) {
    done();
    expect(true).to.equal(false);
});

it('hides failures in nested callbacks', function (done) {
    run(function () {
        done();
        expect(true).to.equal(false);
    });
});
```

Examples of **correct** code for this rule:

```js
it('finishes once', function (done) {
    expect(true).to.equal(true);
    done();
});

it('returns immediately after finishing', function (done) {
    done();
    return;
});
```
