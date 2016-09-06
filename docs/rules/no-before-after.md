# Disallow `before` and `after` in favor of `beforeEach` and `afterEach`

`before()` and `after()` run once before and after all examples. In practice, this can end up causing confusion regarding the order that things are run, and test pollution. To improve the readability and accuracy of your Mocha tests, use `beforeEach()` and `afterEach()` instead, wherever possible.

## Rule Details

The following patterns are considered warnings:

```js
before(() => {

});

after(function () {

});
```

The following patterns are not warnings:

```js
beforeEach(() => {

});

afterEach(function () {

});
```
