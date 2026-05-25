# Enforce limits for Mocha slow thresholds (`mocha/limit-slow`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets suites, tests, and hooks configure the slow threshold with `this.slow(...)` or chained calls such as `it(...).slow(...)`. This rule lets you forbid slow-threshold configuration entirely or constrain the values that are allowed.

This rule applies to:

- `this.slow(...)` inside suite, test, and hook callbacks
- `describe(...).slow(...)`, `it(...).slow(...)`, and hook variants
- TDD interface equivalents such as `suite(...).slow(...)` and `test(...).slow(...)`
- Equivalent configured custom names

With `mode: "disallow"`, getter-style calls such as `this.slow()` and `it(...).slow()` are also reported. Other modes only check calls with a statically known numeric argument.

## Options

This rule supports the following options:

- `{ "mode": "disallow" }`: Reports every Mocha slow-threshold call.
- `{ "mode": "max", "max": 200 }`: Reports statically known numeric slow values greater than `max`.
- `{ "mode": "range", "min": 50, "max": 200 }`: Reports statically known numeric slow values outside the inclusive range.

For `max` and `range`, unresolved dynamic values and string shorthands such as `"2s"` are ignored.

```json
{
    "rules": {
        "mocha/limit-slow": ["error", {
            "mode": "range",
            "min": 50,
            "max": 200
        }]
    }
}
```

## Rule Details

Examples of incorrect code for this rule:

```js
it('works', function () {}).slow(300);

describe('suite', function () {
    this.slow(300);
});
```

Examples of correct code for this rule with `{ "mode": "range", "min": 50, "max": 200 }`:

```js
it('works', function () {});

it('works', function () {}).slow(200);

describe('suite', function () {
    this.slow(100);
});
```

## When Not To Use It

- If your project allows arbitrary Mocha slow-threshold configuration.
- If your project relies heavily on string-based slow values and you need exhaustive checking for those forms.

## Further Reading

- [Mocha Timeouts](https://mochajs.org/features/timeouts/)
