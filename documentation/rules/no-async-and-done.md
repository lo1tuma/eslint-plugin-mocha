# Disallow async functions that also use a Mocha callback (`mocha/no-async-and-done`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha supports asynchronous tests and hooks in three distinct ways:

- Provide a callback parameter such as `done`
- Return a promise
- Use an `async` function

Mixing an `async` function with a callback parameter does both at once and triggers Mocha's "overspecified resolution method" error.

## Rule Details

Examples of **incorrect** code for this rule:

```js
it('loads data', async function (done) {
    done();
});

beforeEach(async (done) => {
    await setup();
    done();
});
```

Examples of **correct** code for this rule:

```js
it('loads data', function (done) {
    loadData(done);
});

it('loads data', async function () {
    await loadData();
});
```

## Further Reading

- [Asynchronous code](https://mochajs.org/#asynchronous-code)
