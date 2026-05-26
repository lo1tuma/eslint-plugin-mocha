const configFiles = ['^dependency-cruiser\\.config\\.js$', '^eslint\\.config\\.js$', '^packtory\\.config\\.js$'];
const entryPointFiles = ['^source/plugin\\.ts$'];
const benchmarkFiles = ['^benchmarks/', '\\.bench\\.ts$'];
const testFiles = ['\\.test\\.ts$'];
const testSupportFiles = ['^source/mocha-interface-test-cases\\.ts$'];
const excludedFiles = ['^(\\./)?target/'];

const ignoreFromOrphans = [...configFiles, ...entryPointFiles, ...benchmarkFiles, ...testFiles, ...testSupportFiles];

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            from: {},
            to: {
                circular: true
            }
        },
        {
            name: 'no-orphans',
            severity: 'error',
            from: {
                orphan: true,
                pathNot: [...ignoreFromOrphans, '\\.d\\.ts$']
            },
            to: {}
        },
        {
            name: 'no-internal-orphans',
            severity: 'error',
            from: {
                pathNot: []
            },
            module: {
                numberOfDependentsLessThan: 1,
                pathNot: [...ignoreFromOrphans, '\\.d\\.ts$']
            }
        },
        {
            name: 'no-internal-but-tested-orphans',
            severity: 'error',
            from: {
                pathNot: [...testFiles, ...benchmarkFiles]
            },
            module: {
                numberOfDependentsLessThan: 1,
                pathNot: [
                    ...ignoreFromOrphans,
                    '.*(?<!\\.(ts|js))$',
                    '^node_modules/',
                    ...excludedFiles,
                    '\\.d\\.ts$'
                ]
            }
        },
        {
            name: 'no-deprecated-npm',
            severity: 'error',
            from: {},
            to: {
                dependencyTypes: ['deprecated']
            }
        },
        {
            name: 'no-duplicate-dep-types',
            severity: 'error',
            from: {},
            to: {
                dependencyTypes: ['npm'],
                dependencyTypesNot: ['type-only'],
                moreThanOneDependencyType: true
            }
        },
        {
            name: 'not-to-dev-dep',
            severity: 'error',
            from: {
                path: '^source/',
                pathNot: testFiles
            },
            to: {
                dependencyTypes: ['npm-dev'],
                moreThanOneDependencyType: false,
                pathNot: ['^node_modules/@types/', '\\.d\\.ts$']
            }
        },
        {
            name: 'no-non-package-json',
            severity: 'error',
            from: {},
            to: {
                dependencyTypes: ['npm-no-pkg', 'npm-unknown']
            }
        },
        {
            name: 'not-test-file-import',
            severity: 'error',
            from: {
                pathNot: [...testFiles, ...benchmarkFiles]
            },
            to: {
                path: [...testFiles, ...benchmarkFiles]
            }
        }
    ],
    options: {
        doNotFollow: {
            path: 'node_modules|target/',
            dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled', 'npm-no-pkg']
        },
        exclude: {
            path: excludedFiles
        },
        moduleSystems: ['cjs', 'es6', 'tsd'],
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: 'tsconfig.json'
        },
        preserveSymlinks: false,
        combinedDependencies: true,
        reporterOptions: {
            dot: {
                collapsePattern: 'node_modules/[^/]+'
            }
        }
    }
};
