export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

format-check:
    dprint check --list-different

format-fix:
    dprint fmt

eslint *options:
    eslint . --max-warnings 0 {{options}}

eslint-fix: (eslint '--fix')

lint-dependencies:
    depcruise --config dependency-cruiser.config.js './source/**/*.ts' './benchmarks/**/*.ts' './*.js' './*.cjs'

lint-docs:
    markdownlint '**/*.md'

lint-eslint-docs: (update-eslint-docs '--check')

lint: lint-docs lint-eslint-docs eslint lint-dependencies

lint-fix: eslint-fix format-fix

compile:
    tsc --build

compile-unit-tests:
    tsc --build source/tsconfig.unit-tests.json

test-unit: compile-unit-tests
    mocha --spec 'target/build/source/**/*.test.js'

test-unit-with-coverage: compile-unit-tests
    c8 mocha --spec 'target/build/source/**/*.test.js'

test-bench:
    tsc --build benchmarks/tsconfig.json
    mocha -t 2400000 --spec 'target/build/benchmarks/**/*.bench.js'

test: test-unit-with-coverage test-bench

coveralls:
    coveralls < ./target/coverage/lcov.info

changelog:
    pr-log

update-eslint-docs *options:
    tsc --build source/tsconfig.sources.json
    eslint-doc-generator --ignore-config all --path-rule-doc 'documentation/rules/{name}.md' --url-configs 'https://github.com/lo1tuma/eslint-plugin-mocha#configs' {{options}}
