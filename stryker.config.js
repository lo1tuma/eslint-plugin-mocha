// @ts-check
/** @typedef {import('@stryker-mutator/core/package.json')} StrykerCorePackage */

const config = {
    testRunner: 'mocha',
    coverageAnalysis: 'perTest',
    tempDirName: 'target/.stryker-tmp',
    allowConsoleColors: false,
    concurrency: '50%',
    buildCommand: 'npx just compile-unit-tests',
    mochaOptions: {
        'no-package': true,
        'no-opts': true,
        'no-config': true,
        spec: [ 'target/build/source/**/*.test.js' ]
    },
    mutate: [
        'source/**/*.ts',
        '!source/**/*.test.ts',
        '!source/**/*.d.ts',
        '!source/mocha-interface-test-cases.ts'
    ],
    ignorePatterns: [ 'node_modules', 'target', '.git' ],
    disableTypeChecks: true,
    thresholds: {
        high: 100,
        low: 100,
        break: 100
    },
    reporters: [ 'clear-text', 'html', 'json' ],
    clearTextReporter: {
        reportMutants: true,
        reportScoreTable: false,
        reportTests: false,
        logTests: false,
        skipFull: true
    },
    htmlReporter: {
        fileName: 'target/stryker/index.html'
    },
    jsonReporter: {
        fileName: 'target/stryker/mutation-report.json'
    }
};

export default config;
