# Disallow calling a Mocha callback more than once (`mocha/no-done-twice`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Calling `done()` more than once is a common callback-style test bug. It can produce confusing pass/fail output and can hide the real source of the failure.

## Rule Details

Examples of **incorrect** code for this rule:

```js
it('calls done twice', function (done) {
    done();
    done();
});

it('calls done on two paths', function (done) {
    if (failed) {
        done(error);
    }

    done();
});
```

Examples of **correct** code for this rule:

```js
it('completes once', function (done) {
    work(function (error) {
        done(error);
    });
});

it('returns after completion', function (done) {
    return done();
});
```
