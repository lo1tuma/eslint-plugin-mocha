import type { ConfigObject, LegacyConfigObject } from '@eslint/core';
import type { ESLint, Linter } from 'eslint';
import globals from 'globals';
import { readClosestPackageMetadata } from './package-metadata.ts';
import { consistentInterfaceRule } from './rules/consistent-interface.ts';
import { consistentSpacingBetweenBlocksRule } from './rules/consistent-spacing-between-blocks.ts';
import { consistentStructureRule } from './rules/consistent-structure.ts';
import { handleDoneCallbackRule } from './rules/handle-done-callback.ts';
import { limitRetriesRule } from './rules/limit-retries.ts';
import { limitSlowRule } from './rules/limit-slow.ts';
import { limitTimeoutRule } from './rules/limit-timeout.ts';
import { maxTopLevelSuitesRule } from './rules/max-top-level-suites.ts';
import { noAsyncAndDoneRule } from './rules/no-async-and-done.ts';
import { noAsyncInSyncTestsRule } from './rules/no-async-in-sync-tests.ts';
import { noAsyncSuiteRule } from './rules/no-async-suite.ts';
import { noCodeAfterDoneRule } from './rules/no-code-after-done.ts';
import { noConditionalTestsRule } from './rules/no-conditional-tests.ts';
import { noDoneTwiceRule } from './rules/no-done-twice.ts';
import { noEmptyTitleRule } from './rules/no-empty-title.ts';
import { noExclusiveTestsRule } from './rules/no-exclusive-tests.ts';
import { noExportsRule } from './rules/no-exports.ts';
import { noHooksForSingleChildRule } from './rules/no-hooks-for-single-child.ts';
import { noHooksRule } from './rules/no-hooks.ts';
import { noIdenticalTitleRule } from './rules/no-identical-title.ts';
import { noMochaArrowsRule } from './rules/no-mocha-arrows.ts';
import { noNestedSuitesRule } from './rules/no-nested-suites.ts';
import { noNestedTestsRule } from './rules/no-nested-tests.ts';
import { noPendingTestsRule } from './rules/no-pending-tests.ts';
import { noReturnAndDoneRule } from './rules/no-return-and-done.ts';
import { noReturnFromAsyncRule } from './rules/no-return-from-async.ts';
import { noRootHooksRule } from './rules/no-root-hooks.ts';
import { noSetupInSuiteRule } from './rules/no-setup-in-suite.ts';
import { noSynchronousTestsRule } from './rules/no-synchronous-tests.ts';
import { noTopLevelTestsRule } from './rules/no-top-level-tests.ts';
import { preferArrowCallbackRule } from './rules/prefer-arrow-callback.ts';
import { validSuiteTitleRule } from './rules/valid-suite-title.ts';
import { validTestTitleRule } from './rules/valid-test-title.ts';

const pluginMeta = await readClosestPackageMetadata(import.meta.url);

const allRules: Linter.RulesRecord = {
    'mocha/consistent-structure': [
        'error',
        {
            order: 'hooks-tests-suites',
            disallowDuplicateHooks: true,
            disallowMixedTestsAndSuites: true
        }
    ],
    'mocha/handle-done-callback': 'error',
    'mocha/limit-retries': 'error',
    'mocha/limit-slow': 'error',
    'mocha/limit-timeout': 'error',
    'mocha/max-top-level-suites': 'error',
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-conditional-tests': 'error',
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
    'mocha/no-return-and-done': 'error',
    'mocha/no-return-from-async': 'error',
    'mocha/no-setup-in-suite': 'error',
    'mocha/no-synchronous-tests': 'error',
    'mocha/no-root-hooks': 'error',
    'mocha/prefer-arrow-callback': 'error',
    'mocha/consistent-spacing-between-blocks': 'error',
    'mocha/consistent-interface': [ 'error', { interface: 'BDD' } ],
    'mocha/valid-suite-title': 'error',
    'mocha/valid-test-title': 'error',
    'mocha/no-empty-title': 'error'
};

const recommendedRules: Linter.RulesRecord = {
    'mocha/consistent-structure': [ 'error', { disallowDuplicateHooks: true } ],
    'mocha/handle-done-callback': 'error',
    'mocha/limit-retries': 'off',
    'mocha/limit-slow': 'off',
    'mocha/limit-timeout': 'off',
    'mocha/max-top-level-suites': 'off',
    'mocha/no-async-and-done': 'error',
    'mocha/no-async-in-sync-tests': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-code-after-done': 'error',
    'mocha/no-conditional-tests': 'error',
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
    'mocha/no-return-and-done': 'error',
    'mocha/no-return-from-async': 'off',
    'mocha/no-setup-in-suite': 'off',
    'mocha/no-synchronous-tests': 'off',
    'mocha/no-root-hooks': 'off',
    'mocha/prefer-arrow-callback': 'off',
    'mocha/valid-suite-title': 'off',
    'mocha/valid-test-title': 'off',
    'mocha/no-empty-title': 'error',
    'mocha/consistent-spacing-between-blocks': 'off',
    'mocha/consistent-interface': 'off'
};

const rules = {
    'consistent-structure': consistentStructureRule,
    'handle-done-callback': handleDoneCallbackRule,
    'limit-retries': limitRetriesRule,
    'limit-slow': limitSlowRule,
    'limit-timeout': limitTimeoutRule,
    'max-top-level-suites': maxTopLevelSuitesRule,
    'no-async-and-done': noAsyncAndDoneRule,
    'no-async-in-sync-tests': noAsyncInSyncTestsRule,
    'no-async-suite': noAsyncSuiteRule,
    'no-code-after-done': noCodeAfterDoneRule,
    'no-conditional-tests': noConditionalTestsRule,
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
    'no-return-and-done': noReturnAndDoneRule,
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

type ImmutablePluginShape<T> = { readonly [Key in keyof T]: T[Key]; };

export type MochaPlugin = ImmutablePluginShape<
    ESLint.Plugin & {
        readonly meta: typeof pluginMeta;
        readonly rules: typeof rules;
        readonly configs: PublishedMochaConfigs;
    }
>;

type PublishedMochaConfigs = Record<string, PublishedMochaConfig> & {
    readonly all: MochaConfig;
    readonly recommended: MochaConfig;
};

type PublishedMochaConfig = Readonly<
    | ConfigObject
    | ConfigObject[]
    | LegacyConfigObject
>;

type MochaConfig = ImmutablePluginShape<
    Linter.Config & {
        readonly plugins: {
            readonly mocha: ESLint.Plugin;
        };
    }
>;

const pluginBase = {
    meta: pluginMeta,
    rules
};

const configs: MochaPlugin['configs'] = {
    all: {
        name: 'mocha/all',
        plugins: { mocha: pluginBase },
        languageOptions: { globals: globals.mocha },
        rules: allRules
    },
    recommended: {
        name: 'mocha/recommended',
        plugins: { mocha: pluginBase },
        languageOptions: { globals: globals.mocha },
        rules: recommendedRules
    }
};

const plugin: MochaPlugin = Object.assign(pluginBase, { configs });

export default plugin;
