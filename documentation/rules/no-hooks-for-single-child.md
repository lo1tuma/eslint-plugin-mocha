# mocha/no-hooks-for-single-child

📝 Disallow hooks with a single direct child.

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Mocha proposes hooks that allow code to be run before or after every or all tests. This helps define a common setup or teardown process for every test. These hooks are not useful when there is only one direct child test or suite at the same level, because it is usually clearer to move the setup or teardown closer to that child.

## Rule Details

This rule looks for every call to `before`, `after`, `beforeEach` and `afterEach` and reports them when the surrounding suite level has only one direct child test or direct child suite.

The following patterns are considered warnings:

```js
describe('foo', function () {
    before(function () {/* ... */}); // Not allowed because there is only one direct child suite next to this hook.

    describe('bar', function () {
        /* ... */
    });
});

describe('foo', function () {
    after(function () {/* ... */}); // Not allowed because there is only one direct child test next to this hook.

    it('should XYZ', function () {
        /* ... */
    });
});

describe('foo', function () {
    beforeEach(function () {/* ... */}); // Not allowed because there are no direct child tests or suites next to this hook.
});
```

These patterns would not be considered warnings:

```js
describe('foo', function () {
    before(function () {/* ... */});

    it('should XYZ', function () {
        /* ... */
    });

    it('should ABC', function () {
        /* ... */
    });
});

describe('foo', function () {
    before(function () {/* ... */});

    it('should XYZ', function () {
        /* ... */
    });

    describe('bar', function () {
        /* ... */
    });
});
```

## Options

This rule supports the following options:

- `allow`: An array containing the names of hooks to allow. This might be used to allow writing `after` hooks to run clean-up code. Defaults to an empty array.

```json
{
    "rules": {
        "mocha/no-hooks-for-single-child": ["error", { "allow": ["after"] }]
    }
}
```

## When Not To Use It

- If you use another library which exposes a similar API as mocha (e.g. `before`, `after`), you should turn this rule off, because it would raise warnings.
- If you turned `no-hooks` on, you should turn this rule off, because it would raise several warnings for the same root cause.
