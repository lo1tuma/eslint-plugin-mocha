# Enforces consistent use of mocha interfaces (`mocha/consistent-interface`)

<!-- end auto-generated rule header -->

Mocha has several interfaces such as `BDD`, `TDD`, `Exports`, `QUnit` etc. Usually mocha works by injecting the variables and functions of the selected interface into the global scope. However when using the `Exports` interface one can import functions of any interface. This rule helps to enforce a consistent use of the same interface when using `Exports`.

## Options

Example of a custom rule configuration:

```js
rules: {
    "mocha/consistent-interface": ["error", { interface: 'BDD' }]
},
```

where:

- `interface` can be set to either `TDD` or `BDD`

## When Not To Use It

If you are not using the `Exports` interface then this rule doesn’t provide any value.
