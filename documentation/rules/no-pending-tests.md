# Disallow pending tests (`mocha/no-pending-tests`)

⚠️ This rule _warns_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Mocha supports pending tests. These are tests with no implementation, such as `it('unimplemented test');`, or tests that are explicitly skipped. This rule lets you warn or error on those cases.

## Rule Details

This rule looks for `it`, `test`, and `specify` function calls with only one argument, where the argument is a string literal.

The following patterns are considered warnings:

```js
it('foo');
specify('foo');
test('foo');

describe.skip('foo', function () {});
it.skip('foo', function () {});
describe['skip']('bar', function () {});
it['skip']('bar', function () {});
xdescribe('baz', function () {});
xit('baz', function () {});

suite.skip('foo', function () {});
test.skip('foo', function () {});
suite['skip']('bar', function () {});
test['skip']('bar', function () {});
```

These patterns are not considered warnings:

```js
it('foo', function () {});
specify('foo', function () {});
test('foo', function () {});

describe('foo', function () {});
it('foo', function () {});
describe.only('bar', function () {});
it.only('bar', function () {});

suite('foo', function () {});
test('foo', function () {});
suite.only('bar', function () {});
test.only('bar', function () {});
```

## When Not To Use It

- If pending or skipped tests are acceptable in your project.

## Further Reading

- [Pending tests](https://mochajs.org/#pending-tests)
