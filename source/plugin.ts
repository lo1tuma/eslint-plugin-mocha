import type { ESLint, Linter } from 'eslint';
import globals from 'globals';
import { consistentInterfaceRule } from './rules/consistent-interface.js';
import { consistentSpacingBetweenBlocksRule } from './rules/consistent-spacing-between-blocks.js';
import { handleDoneCallbackRule } from './rules/handle-done-callback.js';
import { maxTopLevelSuitesRule } from './rules/max-top-level-suites.js';
import { noAsyncSuiteRule } from './rules/no-async-suite.js';
import { noEmptyTitleRule } from './rules/no-empty-title.js';
import { noExclusiveTestsRule } from './rules/no-exclusive-tests.js';
import { noExportsRule } from './rules/no-exports.js';
import { noGlobalTestsRule } from './rules/no-global-tests.js';
import { noHooksForSingleCaseRule } from './rules/no-hooks-for-single-case.js';
import { noHooksRule } from './rules/no-hooks.js';
import { noIdenticalTitleRule } from './rules/no-identical-title.js';
import { noMochaArrowsRule } from './rules/no-mocha-arrows.js';
import { noNestedTestsRule } from './rules/no-nested-tests.js';
import { noPendingTestsRule } from './rules/no-pending-tests.js';
import { noReturnAndCallbackRule } from './rules/no-return-and-callback.js';
import { noReturnFromAsyncRule } from './rules/no-return-from-async.js';
import { noSetupInDescribeRule } from './rules/no-setup-in-describe.js';
import { noSiblingHooksRule } from './rules/no-sibling-hooks.js';
import { noSynchronousTestsRule } from './rules/no-synchronous-tests.js';
import { noTopLevelHooksRule } from './rules/no-top-level-hooks.js';
import { preferArrowCallbackRule } from './rules/prefer-arrow-callback.js';
import { validSuiteTitleRule } from './rules/valid-suite-title.js';
import { validTestTitleRule } from './rules/valid-test-title.js';

const allRules: Linter.RulesRecord = {
    'mocha/handle-done-callback': 'error',
    'mocha/max-top-level-suites': 'error',
    'mocha/no-async-suite': 'error',
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-exports': 'error',
    'mocha/no-global-tests': 'error',
    'mocha/no-hooks': 'error',
    'mocha/no-hooks-for-single-case': 'error',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'error',
    'mocha/no-return-and-callback': 'error',
    'mocha/no-return-from-async': 'error',
    'mocha/no-setup-in-describe': 'error',
    'mocha/no-sibling-hooks': 'error',
    'mocha/no-synchronous-tests': 'error',
    'mocha/no-top-level-hooks': 'error',
    'mocha/prefer-arrow-callback': 'error',
    'mocha/consistent-spacing-between-blocks': 'error',
    'mocha/consistent-interface': ['error', { interface: 'BDD' }],
    'mocha/valid-suite-title': 'error',
    'mocha/valid-test-title': 'error',
    'mocha/no-empty-title': 'error'
};

const recommendedRules: Linter.RulesRecord = {
    'mocha/handle-done-callback': 'error',
    'mocha/max-top-level-suites': ['error', { limit: 1 }],
    'mocha/no-async-suite': 'error',
    'mocha/no-exclusive-tests': 'warn',
    'mocha/no-exports': 'error',
    'mocha/no-global-tests': 'error',
    'mocha/no-hooks': 'off',
    'mocha/no-hooks-for-single-case': 'off',
    'mocha/no-identical-title': 'error',
    'mocha/no-mocha-arrows': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-pending-tests': 'warn',
    'mocha/no-return-and-callback': 'error',
    'mocha/no-return-from-async': 'off',
    'mocha/no-setup-in-describe': 'error',
    'mocha/no-sibling-hooks': 'error',
    'mocha/no-synchronous-tests': 'off',
    'mocha/no-top-level-hooks': 'warn',
    'mocha/prefer-arrow-callback': 'off',
    'mocha/valid-suite-title': 'off',
    'mocha/valid-test-title': 'off',
    'mocha/no-empty-title': 'error',
    'mocha/consistent-spacing-between-blocks': 'error'
} as const;

const mochaPlugin: ESLint.Plugin = {
    rules: {
        'handle-done-callback': handleDoneCallbackRule,
        'max-top-level-suites': maxTopLevelSuitesRule,
        'no-async-suite': noAsyncSuiteRule,
        'no-exclusive-tests': noExclusiveTestsRule,
        'no-exports': noExportsRule,
        'no-global-tests': noGlobalTestsRule,
        'no-hooks': noHooksRule,
        'no-hooks-for-single-case': noHooksForSingleCaseRule,
        'no-identical-title': noIdenticalTitleRule,
        'no-mocha-arrows': noMochaArrowsRule,
        'no-nested-tests': noNestedTestsRule,
        'no-pending-tests': noPendingTestsRule,
        'no-return-and-callback': noReturnAndCallbackRule,
        'no-return-from-async': noReturnFromAsyncRule,
        'no-setup-in-describe': noSetupInDescribeRule,
        'no-sibling-hooks': noSiblingHooksRule,
        'no-synchronous-tests': noSynchronousTestsRule,
        'no-top-level-hooks': noTopLevelHooksRule,
        'prefer-arrow-callback': preferArrowCallbackRule,
        'consistent-spacing-between-blocks': consistentSpacingBetweenBlocksRule,
        'consistent-interface': consistentInterfaceRule,
        'valid-suite-title': validSuiteTitleRule,
        'valid-test-title': validTestTitleRule,
        'no-empty-title': noEmptyTitleRule
    }
};

mochaPlugin.configs = {
    all: {
        name: 'mocha/all',
        plugins: { mocha: mochaPlugin },
        languageOptions: { globals: globals.mocha },
        rules: allRules
    },
    recommended: {
        name: 'mocha/recommended',
        plugins: { mocha: mochaPlugin },
        languageOptions: { globals: globals.mocha },
        rules: recommendedRules
    }
};

export default mochaPlugin;
