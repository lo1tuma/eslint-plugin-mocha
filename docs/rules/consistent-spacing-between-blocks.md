# Require consistent spacing between blocks (`mocha/consistent-spacing-between-blocks`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Mocha testing framework provides a structured way of writing tests using functions like `describe`, `it`, `before`, `after`, `beforeEach`, and `afterEach`. As a convention, it is very common to add some spacing between these calls. It's unfortunately also quite common that this spacing is applied inconsistently.

Example:

```js
describe("MyComponent", function () {
    beforeEach(function () {
        // setup code
    });
    it("should behave correctly", function () {
        // test code
    });
    afterEach(function () {
        // teardown code
    });
});
```

In this example, there are no line breaks between Mocha function calls, making the code harder to read.

## Rule Details

This rule enforces a line break between calls to Mocha functions (before, after, describe, it, beforeEach, afterEach) within describe blocks.

The following patterns are considered errors:

```javascript
describe("MyComponent", function () {
    beforeEach(function () {
        // setup code
    });
    it("should behave correctly", function () {
        // test code
    });
});
```

These patterns would not be considered errors:

```javascript
describe("MyComponent", function () {
    beforeEach(function () {
        // setup code
    });

    it("should behave correctly", function () {
        // test code
    });

    afterEach(function () {
        // teardown code
    });
});
```

## When Not To Use It

If you don't prefer this convention.
