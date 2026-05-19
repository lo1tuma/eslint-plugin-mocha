import dprintPlugin from '@ben_12/eslint-plugin-dprint';
import { baseConfig } from '@enormora/eslint-config-base';
import { mochaConfig } from '@enormora/eslint-config-mocha';
import { nodeConfig, nodeConfigFileConfig, nodeEntryPointFileConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';
import eslintPluginEslintPlugin from 'eslint-plugin-eslint-plugin';

export default [
    {
        ignores: ['target/**/*']
    },
    baseConfig,
    nodeConfig,
    {
        plugins: { dprint: dprintPlugin },
        rules: {
            'prettier/prettier': 'off',
            'dprint/typescript': ['error', { configFile: 'dprint.json' }],
            'import/order': 'off',
            '@stylistic/member-delimiter-style': 'off',

            // rules disabled because they don’t work with eslint v9 yet
            'no-secrets/no-secrets': 'off',
            'import/no-named-as-default-member': 'off',
            'import/no-named-as-default': 'off',
            'import/no-mutable-exports': 'off',
            'import/newline-after-import': 'off',
            'import/no-amd': 'off',
            'import/no-commonjs': 'off',
            'import/no-useless-path-segments': 'off',
            'import/first': 'off',

            // incompatible with dprint
            '@stylistic/indent-binary-ops': 'off'
        }
    },
    {
        ...typescriptConfig,
        files: ['**/*.ts']
    },
    {
        files: ['**/*.ts'],
        rules: {
            'functional/type-declaration-immutability': 'off',
            'functional/prefer-immutable-types': 'off'
        }
    },
    {
        ...nodeConfigFileConfig,
        files: ['eslint.config.js']
    },
    {
        ...mochaConfig,
        files: ['**/*.test.ts', 'benchmarks/**/*.bench.ts']
    },
    {
        files: ['**/*.test.ts', 'benchmarks/**/*.bench.ts'],
        rules: {
            'max-statements': ['error', { max: 50 }],
            'max-nested-callbacks': ['error', { max: 8 }],
            'no-magic-numbers': 'off',
            '@typescript-eslint/no-magic-numbers': 'off',
            'no-template-curly-in-string': 'off'
        }
    },
    {
        files: ['source/plugin.test.ts'],
        rules: {
            'import/no-dynamic-require': 'off'
        }
    },
    {
        files: ['benchmarks/startup.bench.ts'],
        rules: {
            'import/no-unassigned-import': 'off'
        }
    },
    {
        files: ['test/rules/*.ts'],
        rules: {
            'no-template-curly-in-string': 'off'
        }
    },
    {
        ...nodeEntryPointFileConfig,
        files: ['source/plugin.ts']
    },
    {
        files: ['source/plugin.ts'],
        rules: {
            'import/no-default-export': 'off'
        }
    },
    {
        ...eslintPluginEslintPlugin.configs['flat/rules-recommended'],
        files: ['source/rules/**/*.ts'],
        rules: {
            ...eslintPluginEslintPlugin.configs['flat/rules-recommended'].rules,
            'eslint-plugin/no-identical-tests': 'error',
            'eslint-plugin/no-only-tests': 'error',
            'eslint-plugin/require-meta-docs-description': ['error', { pattern: '^(Enforce|Require|Disallow)' }],
            'eslint-plugin/require-meta-docs-url': [
                'error',
                { pattern: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/{{name}}.md' }
            ]
        }
    },
    {
        ...eslintPluginEslintPlugin.configs['flat/tests-recommended'],
        files: ['source/rules/*.test.ts'],
        rules: {
            ...eslintPluginEslintPlugin.configs['flat/tests-recommended'].rules,
            'eslint-plugin/prefer-output-null': 'off'
        }
    }
];
