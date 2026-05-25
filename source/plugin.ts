import type { ESLint, Linter } from 'eslint';
import globals from 'globals';
import { readClosestPackageMetadata } from './package-metadata.js';
import { consistentInterfaceRule } from './rules/consistent-interface.js';
import { consistentSpacingBetweenBlocksRule } from './rules/consistent-spacing-between-blocks.js';
import { consistentStructureRule } from './rules/consistent-structure.js';
import { handleDoneCallbackRule } from './rules/handle-done-callback.js';
import { limitRetriesRule } from './rules/limit-retries.js';
import { limitTimeoutRule } from './rules/limit-timeout.js';
import { maxTopLevelSuitesRule } from './rules/max-top-level-suites.js';
import { noAsyncAndDoneRule } from './rules/no-async-and-done.js';
import { noAsyncInSyncTestsRule } from './rules/no-async-in-sync-tests.js';
import { noAsyncSuiteRule } from './rules/no-async-suite.js';
import { noCodeAfterDoneRule } from './rules/no-code-after-done.js';
import { noDoneTwiceRule } from './rules/no-done-twice.js';
import { noEmptyTitleRule } from './rules/no-empty-title.js';
import { noExclusiveTestsRule } from './rules/no-exclusive-tests.js';
import { noExportsRule } from './rules/no-exports.js';
import { noHooksForSingleChildRule } from './rules/no-hooks-for-single-child.js';
import { noHooksRule } from './rules/no-hooks.js';
import { noIdenticalTitleRule } from './rules/no-identical-title.js';
import { noMochaArrowsRule } from './rules/no-mocha-arrows.js';
import { noNestedSuitesRule } from './rules/no-nested-suites.js';
import { noNestedTestsRule } from './rules/no-nested-tests.js';
import { noPendingTestsRule } from './rules/no-pending-tests.js';
import { noReturnAndCallbackRule } from './rules/no-return-and-callback.js';
import { noReturnFromAsyncRule } from './rules/no-return-from-async.js';
import { noRootHooksRule } from './rules/no-root-hooks.js';
import { noSetupInSuiteRule } from './rules/no-setup-in-suite.js';
import { noSynchronousTestsRule } from './rules/no-synchronous-tests.js';
import { noTopLevelTestsRule } from './rules/no-top-level-tests.js';
import { preferArrowCallbackRule } from './rules/prefer-arrow-callback.js';
import { validSuiteTitleRule } from './rules/valid-suite-title.js';
import { validTestTitleRule } from './rules/valid-test-title.js';

const pluginMeta = await readClosestPackageMetadata(import.meta.url);

const allRules: Linter.RulesRecord = {
    'mocha/consistent-structure': [
        'error',
        { order: 'hooks-tests-suites', disallowDuplicateHooks: true, disallowMixedTestsAndSuites: true }
    ],
    'mocha/handle-done-callback': 'error',
    'mocha/limit-retries': 'error',
    'mocha/limit-timeout': 'error',
    'mocha/max-top-level-suites': 'error',
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-done-twice': 'error',
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-exports': 'error',
    'mocha/no-top-level-tests': 'error',
    'mocha/no-hooks': 'error',
    'mocha/no-hooks-for-single-child': 'error',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-suites': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'error',
    'mocha/no-return-and-callback': 'error',
    'mocha/no-return-from-async': 'error',
    'mocha/no-setup-in-suite': 'error',
    'mocha/no-synchronous-tests': 'error',
    'mocha/no-root-hooks': 'error',
    'mocha/prefer-arrow-callback': 'error',
    'mocha/consistent-spacing-between-blocks': 'error',
    'mocha/consistent-interface': ['error', { interface: 'BDD' }],
    'mocha/valid-suite-title': 'error',
    'mocha/valid-test-title': 'error',
    'mocha/no-empty-title': 'error'
};

const recommendedRules: Linter.RulesRecord = {
    'mocha/consistent-structure': ['error', { disallowDuplicateHooks: true }],
    'mocha/handle-done-callback': 'error',
    'mocha/limit-retries': 'off',
    'mocha/limit-timeout': 'off',
    'mocha/max-top-level-suites': ['error', { limit: 1 }],
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'off',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-done-twice': 'error',
    'mocha/no-exclusive-tests': 'warn',
    'mocha/no-exports': 'error',
    'mocha/no-top-level-tests': 'error',
    'mocha/no-hooks': 'off',
    'mocha/no-hooks-for-single-child': 'off',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-suites': 'off',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'warn',
    'mocha/no-return-and-callback': 'error',
    'mocha/no-return-from-async': 'off',
    'mocha/no-setup-in-suite': 'error',
    'mocha/no-synchronous-tests': 'off',
    'mocha/no-root-hooks': 'warn',
    'mocha/prefer-arrow-callback': 'off',
    'mocha/valid-suite-title': 'off',
    'mocha/valid-test-title': 'off',
    'mocha/no-empty-title': 'error',
    'mocha/consistent-spacing-between-blocks': 'error',
    'mocha/consistent-interface': ['error', { interface: 'BDD' }]
};

const rules = {
    'consistent-structure': consistentStructureRule,
    'handle-done-callback': handleDoneCallbackRule,
    'limit-retries': limitRetriesRule,
    'limit-timeout': limitTimeoutRule,
    'max-top-level-suites': maxTopLevelSuitesRule,
    'no-async-and-done': noAsyncAndDoneRule,
    'no-async-in-sync-tests': noAsyncInSyncTestsRule,
    'no-async-suite': noAsyncSuiteRule,
    'no-code-after-done': noCodeAfterDoneRule,
    'no-done-twice': noDoneTwiceRule,
    'no-exclusive-tests': noExclusiveTestsRule,
    'no-exports': noExportsRule,
    'no-top-level-tests': noTopLevelTestsRule,
    'no-hooks': noHooksRule,
    'no-hooks-for-single-child': noHooksForSingleChildRule,
    'no-identical-title': noIdenticalTitleRule,
    'no-mocha-arrows': noMochaArrowsRule,
    'no-nested-suites': noNestedSuitesRule,
    'no-nested-tests': noNestedTestsRule,
    'no-pending-tests': noPendingTestsRule,
    'no-return-and-callback': noReturnAndCallbackRule,
    'no-return-from-async': noReturnFromAsyncRule,
    'no-setup-in-suite': noSetupInSuiteRule,
    'no-synchronous-tests': noSynchronousTestsRule,
    'no-root-hooks': noRootHooksRule,
    'prefer-arrow-callback': preferArrowCallbackRule,
    'consistent-spacing-between-blocks': consistentSpacingBetweenBlocksRule,
    'consistent-interface': consistentInterfaceRule,
    'valid-suite-title': validSuiteTitleRule,
    'valid-test-title': validTestTitleRule,
    'no-empty-title': noEmptyTitleRule
};

type MochaConfig = Linter.Config & {
    plugins: {
        mocha: ESLint.Plugin;
    };
};

const configs: {
    all: MochaConfig;
    recommended: MochaConfig;
} = {
    all: {
        name: 'mocha/all',
        plugins: { mocha: {} },
        languageOptions: { globals: globals.mocha },
        rules: allRules
    },
    recommended: {
        name: 'mocha/recommended',
        plugins: { mocha: {} },
        languageOptions: { globals: globals.mocha },
        rules: recommendedRules
    }
};

export type MochaPlugin = ESLint.Plugin & {
    meta: typeof pluginMeta;
    rules: typeof rules;
    configs: typeof configs;
};

const plugin: MochaPlugin = {
    meta: pluginMeta,
    rules,
    configs
};

plugin.configs.all.plugins.mocha = plugin;
plugin.configs.recommended.plugins.mocha = plugin;

export default plugin;
