export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

eslint *options:
    eslint . .github --max-warnings 0 {{options}}

eslint-fix: (eslint '--fix')

lint-dependencies:
    depcruise --config dependency-cruiser.config.js './source/**/*.ts' './benchmarks/**/*.ts' './*.js' './*.cjs'

lint-unused-code:
    knip
    knip --production

lint-duplication *options:
    jscpd source --config jscpd.json {{options}}

lint-eslint-docs: (update-eslint-docs '--check')

lint: lint-eslint-docs eslint lint-dependencies lint-unused-code lint-duplication

lint-fix: eslint-fix

compile:
    tsc --build

compile-unit-tests:
    tsc --build source/tsconfig.unit-tests.json

test-unit: compile-unit-tests
    mocha --spec 'target/build/source/**/*.test.js'

test-unit-with-coverage: compile-unit-tests
    c8 mocha --spec 'target/build/source/**/*.test.js'

test-mutation:
    stryker run

test-bench:
    tsc --build benchmarks/tsconfig.json
    mocha -t 2400000 --spec 'target/build/benchmarks/**/*.bench.js'

test: test-unit-with-coverage test-bench

coveralls:
    coveralls < ./target/coverage/lcov.info

pack-preview:
    packtory preview

prepare-release: compile
    packtory release-pr maintain --no-dry-run

validate-release-pr:
    packtory release-pr validate

validate-pr-labels pull-request-number:
    pr-log validate-pull-request-labels {{pull-request-number}}

authorize-release-publish *options:
    packtory release-pr authorize-publish {{options}}

publish-release: compile
    packtory release --publish --tag --push --github-release --no-dry-run

publish-dry-run: compile
    packtory publish

publish: compile
    packtory publish --no-dry-run

update-eslint-docs *options:
    tsc --build source/tsconfig.sources.json
    eslint-doc-generator --ignore-config all --path-rule-doc 'documentation/rules/{name}.md' --url-configs 'https://github.com/lo1tuma/eslint-plugin-mocha#configs' {{options}}
