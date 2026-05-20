# Disallow pending tests (`mocha/no-pending-tests`)

⚠️ This rule _warns_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Mocha supports pending tests. These are tests with no implementation, such as `it('unimplemented test');`, or tests that are explicitly skipped. This rule lets you warn or error on those cases.

This rule intentionally does not support the `--fix` CLI option. Many editors apply ESLint fixes on save, and silently enabling skipped tests again would be a bad default while debugging. For direct `.skip` and `xdescribe()`-style calls, the rule does provide ESLint suggestions so you can remove the pending modifier explicitly.

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
