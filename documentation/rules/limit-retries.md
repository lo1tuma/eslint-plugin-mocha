# mocha/limit-retries

📝 Enforce limits for Mocha retries.

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets suites, tests, and hooks configure retries with `this.retries(...)` or chained calls such as `it(...).retries(...)`. This rule lets you forbid retry configuration entirely or constrain the values that are allowed.

This rule applies to:

- `this.retries(...)` inside suite, test, and hook callbacks
- `describe(...).retries(...)`, `it(...).retries(...)`, and hook variants
- TDD interface equivalents such as `suite(...).retries(...)` and `test(...).retries(...)`
- Equivalent configured custom names

With `mode: "disallow"`, getter-style calls such as `this.retries()` and `it(...).retries()` are also reported. Other modes only check calls with a statically known numeric argument.

## Options

This rule supports the following options:

- `{ "mode": "disallow" }`: Reports every Mocha retry call.
- `{ "mode": "max", "max": 2 }`: Reports statically known numeric retry values greater than `max`.
- `{ "mode": "range", "min": 0, "max": 2 }`: Reports statically known numeric retry values outside the inclusive range.

For `max` and `range`, unresolved dynamic values are ignored.

```json
{
    "rules": {
        "mocha/limit-retries": ["error", {
            "mode": "range",
            "min": 0,
            "max": 2
        }]
    }
}
```

## Rule Details

Examples of incorrect code for this rule:

```js
it('works', function () {}).retries(3);

describe('suite', function () {
    this.retries(3);
});
```

Examples of correct code for this rule with `{ "mode": "range", "min": 0, "max": 2 }`:

```js
it('works', function () {});

it('works', function () {}).retries(2);

describe('suite', function () {
    this.retries(1);
});
```

## When Not To Use It

- If your project allows arbitrary Mocha retry configuration.

## Further Reading

- [Mocha Retry Tests](https://mochajs.org/declaring/retrying-tests/)
