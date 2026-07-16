# mocha/no-mocha-arrows

📝 Disallow arrow functions as arguments to mocha functions.

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Mocha [discourages](https://mochajs.org/#arrow-functions) passing arrow functions to suites, tests, and hooks. This rule prevents that on the Mocha globals.

## Rule Details

This rule looks for occurrences of the Mocha functions (`describe`, `it`, `beforeEach`, etc.) within the source code.

The following patterns are considered warnings:

```js
it(() => {
    assert(something, false);
});
it('should be false', () => {
    assert(something, false);
});
beforeEach(() => {
    doSomething();
});
beforeEach((done) => {
    doSomething();
    done();
});
```

These patterns would not be considered warnings:

```js
it();
it(function () {
    assert(something, false);
});
it('should be false', function () {
    assert(something, false);
});
```

This rule only checks the global interface. It does not cover Mocha's [`require` interface](https://mochajs.org/#require).

## When Not To Use It

- If you want to pass arrow functions to Mocha.
- If other globals in your project share names with Mocha globals.
