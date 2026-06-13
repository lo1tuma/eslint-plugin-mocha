import { baseConfig } from '@enormora/eslint-config-base';
import { createEslintPluginConfig } from '@enormora/eslint-config-eslint-plugin';
import { mochaConfig } from '@enormora/eslint-config-mocha';
import { nodeConfig, nodeConfigFileConfig, nodeEntryPointFileConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

const eslintPluginConfig = createEslintPluginConfig({
    descriptionPattern: '^(Enforce|Require|Disallow)',
    docsUrlPattern: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/{{name}}.md'
});

export default [
    {
        ignores: [ 'CHANGELOG.md', 'target/**/*' ]
    },
    ...baseConfig,
    {
        ...nodeConfig,
        files: [ '**/*.{js,cjs,mjs,ts,cts,mts}' ]
    },
    {
        files: [ '**/*.{js,cjs,mjs,ts,cts,mts}' ],
        rules: {
            '@stylistic/operator-linebreak': 'off',
            'sonarjs/deprecation': 'off'
        }
    },
    {
        ...typescriptConfig,
        files: [ '**/*.ts' ]
    },
    {
        ...nodeConfigFileConfig,
        files: [ 'dependency-cruiser.config.js', 'eslint.config.js', 'packtory.config.js', 'stryker.config.js' ]
    },
    {
        ...mochaConfig,
        files: [ '**/*.test.ts', '**/*.test-support.ts', 'benchmarks/**/*.bench.ts' ]
    },
    {
        ...nodeEntryPointFileConfig,
        files: [ 'source/plugin.ts', 'stryker.config.js' ]
    },
    {
        files: [ 'source/plugin.ts' ],
        rules: {
            'import/no-default-export': 'off'
        }
    },
    {
        ...eslintPluginConfig,
        files: [ 'source/rules/**/*.ts' ],
        rules: {
            ...eslintPluginConfig.rules,
            'eslint-plugin/no-property-in-node': 'error'
        }
    }
];
