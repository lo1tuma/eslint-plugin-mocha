# mocha/no-setup-in-suite

📝 Disallow setup in suite blocks.

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

<!-- end auto-generated rule header -->

Setup for test cases in mocha should be done in `before`, `beforeEach`, or `it` blocks. Unfortunately there is nothing stopping you from doing setup directly inside a suite block.

```js
describe('something', function () {
    const a = setup();
    const b = a.getter;
    it('should work', function () {
        assert(a === b);
    });
});
```

Any setup directly in a suite body is run before all tests execute. This is undesirable primarily for two reasons:

1. When doing TDD in a large codebase, all setup is run for tests that don't have `only` set. This can add a substantial amount of time per iteration.
2. If global state is altered by the setup of another suite block, your test may be affected.

For this rule, "setup" means code that executes immediately while the suite callback itself is evaluated. That includes work done directly in the suite body before any tests run, even when the code looks harmless.

In practice, this rule reports direct function calls and direct property access in suite bodies. Property access is included because getters can execute code. Exceptions are made for Mocha's structural calls (`describe`, `it`, hooks, and their supported variants) and Mocha suite configuration calls such as `this.timeout();`, `it(...).timeout();`, or `before(...).timeout();`.

This rule does not make special exceptions for JavaScript builtins. For example, `Symbol()` is still a direct function call in the suite body and is reported by default.

If you're using [dynamically generated tests](https://mochajs.org/#dynamically-generating-tests), you should disable this rule.

## Rule Details

This rule looks for all function calls and use of the dot operator which are nested directly in a suite block.

The following patterns are considered problems:

```js
describe('something', function () {
    let a = b.c;
    it('should work', function () {});
});

describe('something', function () {
    const a = setup();
    it('should work', function () {});
});
```

These patterns would not be considered problems:

```js
describe('something', function () {
    var a;
    beforeEach(function () {
        a = setup();
    });
    it('should work', function () {});
});
function getTest() {
    var a = setup(),
        b = a.someGetter;
    describe('something', function () {
        it('should work', function () {});
    });
}
describe('something', function () {
    function setup() {
        const a = setup(),
            b = a.someGetter;
        return { a, b };
    }
    it('should work', function () {
        const { a, b } = setup();
    });
});
describe('something', function () {
    this.timeout(5000);
    it('should take awhile', function () {});
});
```

## Options

This rule accepts one optional object:

- `allow`: an array of call names that should be allowed directly in suite bodies

Entries may be written with or without `()`. Dotted names are supported.

```json
{
    "rules": {
        "mocha/no-setup-in-suite": ["error", {
            "allow": ["Symbol", "Object.freeze"]
        }]
    }
}
```

With this option, the following patterns would not be considered problems:

```js
describe('something', function () {
    const token = Symbol('id');
    Object.freeze(sharedFixture);
    it('should work', function () {});
});
```

The `allow` option only applies to calls. It does not allow bare property access:

```js
describe('something', function () {
    Object.freeze;
    it('should work', function () {});
});
```
