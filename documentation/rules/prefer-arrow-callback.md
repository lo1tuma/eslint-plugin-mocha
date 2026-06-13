# Require using arrow functions for callbacks (`mocha/prefer-arrow-callback`)

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

This rule is a Mocha-aware drop-in replacement for ESLint's core
[`prefer-arrow-callback`](https://eslint.org/docs/latest/rules/prefer-arrow-callback) rule.

Use it instead of the core rule when linting Mocha tests. It keeps the core rule's behavior, options,
and fixes, but does not report the callback functions passed directly to Mocha suites, tests, and hooks.

```json
{
    "rules": {
        "prefer-arrow-callback": 0,
        "mocha/prefer-arrow-callback": 2
    }
}
```

## Rule Details

This rule behaves like ESLint's core `prefer-arrow-callback`, except that direct callbacks for Mocha
functions are allowed.

These patterns are considered correct:

```js
/* eslint mocha/prefer-arrow-callback: "error" */

describe('suite', function () {
    beforeEach(function () {
        setup();
    });

    it('works', function () {
        runAssertion();
    });
});
```

Non-Mocha callbacks are still checked, even when they appear inside Mocha callbacks:

```js
/* eslint mocha/prefer-arrow-callback: "error" */

it('works', function () {
    foo(function () {
        bar();
    }); // ERROR
});
```

## Options

This rule supports the same options as ESLint's core
[`prefer-arrow-callback`](https://eslint.org/docs/latest/rules/prefer-arrow-callback#options) rule:

- `allowNamedFunctions`
- `allowUnboundThis`

The only behavior change is the Mocha-specific exemption described above.

## When Not To Use It

- If you are not linting Mocha code.
- If you want the core rule to report Mocha suite, test, and hook callbacks as well.

## Further Reading

- [ESLint core `prefer-arrow-callback`](https://eslint.org/docs/latest/rules/prefer-arrow-callback)
- [Mocha and arrow functions](https://mochajs.org/#arrow-functions)
