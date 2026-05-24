# Disallow async operations in synchronous tests or hooks (`mocha/no-async-in-sync-tests`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha only waits for asynchronous work when a test or hook uses one of Mocha's async entry points: a `done` callback, an `async` function, or a returned promise.

This rule catches suspicious async work inside callbacks that Mocha still treats as synchronous.

## Rule Details

The rule checks synchronous Mocha tests and hooks for two patterns:

- Promise-based work that is started without being returned.
- Callback-based work where an inline callback starts with an `err` or `error` parameter.

When TypeScript parser services with type information are available, promise detection uses the exact `PromiseLike` return type of the expression. Without type information, the rule falls back to `.then()`, `.catch()`, and `.finally()` call chains.

The following patterns are considered warnings:

```js
it('loads data', function () {
    loadData(function (error, result) {
        expect(error).to.not.exist;
        expect(result).to.deep.equal({ ok: true });
    });
});

it('loads data', function () {
    loadData().then(function (result) {
        expect(result).to.deep.equal({ ok: true });
    });
});

before(function () {
    initialize().finally(cleanup);
});
```

These patterns would not be considered warnings:

```js
it('loads data', function (done) {
    loadData(function (error, result) {
        expect(error).to.not.exist;
        expect(result).to.deep.equal({ ok: true });
        done();
    });
});

it('loads data', async function () {
    expect(await loadData()).to.deep.equal({ ok: true });
});

it('loads data', function () {
    return loadData().then(function (result) {
        expect(result).to.deep.equal({ ok: true });
    });
});
```

## When Not To Use It

- If your project intentionally mixes synchronous Mocha callbacks with background async work.
- If the JavaScript fallback heuristics are too noisy for your codebase.

## Further Reading

- [Asynchronous code](https://mochajs.org/#asynchronous-code)
