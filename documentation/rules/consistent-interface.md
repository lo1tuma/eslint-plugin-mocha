# Enforces consistent use of mocha interfaces (`mocha/consistent-interface`)

<!-- end auto-generated rule header -->

Mocha supports several interfaces, such as `BDD`, `TDD`, and `Exports`. Most of the time Mocha injects the chosen interface into the global scope. With `Exports`, you can import functions from any interface instead. This rule helps keep that usage consistent.

## Options

Example configuration:

```js
rules: {
    "mocha/consistent-interface": ["error", { interface: 'BDD' }]
},
```

- `interface` can be either `TDD` or `BDD`

## When Not To Use It

If you are not using the `Exports` interface, this rule adds little value.
