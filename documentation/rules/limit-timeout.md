# Enforce limits for Mocha timeouts (`mocha/limit-timeout`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha lets suites, tests, and hooks override their timeout with `this.timeout(...)` or chained calls such as `it(...).timeout(...)`. This rule lets you forbid timeout configuration entirely or constrain the values that are allowed.

This rule applies to:

- `this.timeout(...)` inside suite, test, and hook callbacks
- `describe(...).timeout(...)`, `it(...).timeout(...)`, and hook variants
- TDD interface equivalents such as `suite(...).timeout(...)` and `test(...).timeout(...)`
- Equivalent configured custom names

With `mode: "disallow"`, getter-style calls such as `this.timeout()` and `it(...).timeout()` are also reported. Other modes only check calls with a statically known numeric argument.

## Options

This rule supports the following options:

- `{ "mode": "disallow" }`: Reports every Mocha timeout call.
- `{ "mode": "disallowDisabled" }`: Reports timeout values that disable timeouts. In current Mocha behavior, that includes values less than or equal to `0` and values greater than or equal to `2^31 - 1`.
- `{ "mode": "max", "max": 5000 }`: Reports statically known numeric timeout values greater than `max`.
- `{ "mode": "range", "min": 1, "max": 5000 }`: Reports statically known numeric timeout values outside the inclusive range.

For `max` and `range`, unresolved dynamic values and string shorthands such as `"2s"` are ignored.

```json
{
    "rules": {
        "mocha/limit-timeout": ["error", {
            "mode": "range",
            "min": 1,
            "max": 5000
        }]
    }
}
```

## Rule Details

Examples of incorrect code for this rule:

```js
it('works', function () {}).timeout(5000);

describe('suite', function () {
    this.timeout(0);
});

beforeEach(function () {}).timeout(10_000);
```

Examples of correct code for this rule with `{ "mode": "range", "min": 1, "max": 5000 }`:

```js
it('works', function () {});

it('works', function () {}).timeout(5000);

describe('suite', function () {
    this.timeout(2500);
});
```

Examples of correct code for this rule with `{ "mode": "disallowDisabled" }`:

```js
it('works', function () {}).timeout(5000);

describe('suite', function () {
    this.timeout(2500);
});
```

## When Not To Use It

- If your project allows arbitrary Mocha timeout configuration.
- If your project relies heavily on dynamic or string-based timeout values and you need exhaustive checking for those forms.

## Further Reading

- [Mocha Timeouts](https://mochajs.org/features/timeouts/)
