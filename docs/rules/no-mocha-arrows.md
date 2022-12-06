# Disallow arrow functions as arguments to mocha functions (`mocha/no-mocha-arrows`)

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/lo1tuma/eslint-plugin-mocha#configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Mocha [discourages](http://mochajs.org/#arrow-functions) passing it arrow functions as arguments. This rule prevents their use on the Mocha globals.

## Rule Details

This rule looks for occurrences of the Mocha functions (`describe`, `it`, `beforeEach`, etc.) within the source code.

The following patterns are considered warnings:

```js
it(() => { assert(something, false); })
it("should be false", () => { assert(something, false); })
beforeEach(() => { doSomething(); })
beforeEach((done) => { doSomething(); done(); })
```

These patterns would not be considered warnings:

```js
it()
it(function() { assert(something, false); })
it("should be false", function() { assert(something, false); })
```

This does not check usage of the [`require` interface](http://mochajs.org/#require) for Mocha, only the globals.

## When Not To Use It

* If you want to pass arrow functions to mocha, turn this rule off.
* If you have other globals which share names with mocha globals, you should turn this rule off, because it would raise warnings.
