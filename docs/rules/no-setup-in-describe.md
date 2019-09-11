
# Disallow setup in describe blocks (no-setup-in-describe)

Setup for test cases in mocha should be done in `before`, `beforeEach`, or `it` blocks. Unfortunately there is nothing stopping you from doing setup directly inside a `describe` block.

```js
describe('something', function () {
    const a = setup();
    const b = a.getter;
    it('should work', function () {
        assert(a === b);
    });
});
```

Any setup directly in a `describe` is run before all tests execute. This is undesirable primarily for two reasons:

1. When doing TDD in a large codebase, all setup is run for tests that don't have `only` set. This can add a substantial amount of time per iteration.
2. If global state is altered by the setup of another describe block, your test may be affected.

This rule reports all function calls and use of the dot operator (due to getters and setters) directly in describe blocks. An exception is made for Mocha's suite configuration methods, like `this.timeout();`, which do not represent setup logic.

If you're using [dynamically generated tests](https://mochajs.org/#dynamically-generating-tests), you should disable this rule.

## Rule Details

This rule looks for all function calls and use of the dot operator which are nested directly in a describe block.

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
    beforeEach(function() {
        a = setup();
    });
    it('should work', function () {});
});
function getTest() {
    var a = setup(),
        b = a.someGetter;
    describe('something', function() {
        it ('should work', function() {});
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
