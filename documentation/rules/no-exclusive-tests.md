# Disallow exclusive tests (`mocha/no-exclusive-tests`)

⚠️ This rule _warns_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets you run a single suite or test by appending `.only`. That is useful while debugging, but easy to leave behind by accident. This rule warns whenever exclusive tests are used.

## Rule Details

This rule looks for `describe.only`, `it.only`, `suite.only`, `test.only`, `context.only`, and `specify.only`.

Some edge cases cannot be detected, for example:

```js
var describeOnly = describe.only;
describeOnly.apply(describe);
```

The following patterns are considered warnings:

```js
// bdd
describe.only('foo', function () {});
it.only('foo', function () {});
describe['only']('bar', function () {});
it['only']('bar', function () {});

// tdd
suite.only('foo', function () {});
test.only('foo', function () {});
suite['only']('bar', function () {});
test['only']('bar', function () {});
```

These patterns would not be considered warnings:

```js
// bdd
describe('foo', function () {});
it('foo', function () {});
describe.skip('bar', function () {});
it.skip('bar', function () {});

// tdd
suite('foo', function () {});
test('foo', function () {});
suite.skip('bar', function () {});
test.skip('bar', function () {});
```

## When Not To Use It

- If your workflow intentionally keeps exclusive tests in the codebase.
- If another library exposes a similar API, such as `describe.only`.

## Further Reading

- [Exclusive tests](https://mochajs.org/#exclusive-tests)
