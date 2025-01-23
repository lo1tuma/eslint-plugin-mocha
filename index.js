import globals from 'globals';
import { consistentInterfaceRule } from './lib/rules/consistent-interface.js';
import { consistentSpacingBetweenBlocksRule } from './lib/rules/consistent-spacing-between-blocks.js';
import { handleDoneCallbackRule } from './lib/rules/handle-done-callback.js';
import { maxTopLevelSuitesRule } from './lib/rules/max-top-level-suites.js';
import { noAsyncDescribeRule } from './lib/rules/no-async-describe.js';
import { noEmptyDescriptionRule } from './lib/rules/no-empty-description.js';
import { noExclusiveTestsRule } from './lib/rules/no-exclusive-tests.js';
import { noExportsRule } from './lib/rules/no-exports.js';
import { noGlobalTestsRule } from './lib/rules/no-global-tests.js';
import { noHooksForSingleCaseRule } from './lib/rules/no-hooks-for-single-case.js';
import { noHooksRule } from './lib/rules/no-hooks.js';
import { noIdenticalTitleRule } from './lib/rules/no-identical-title.js';
import { noMochaArrowsRule } from './lib/rules/no-mocha-arrows.js';
import { noNestedTestsRule } from './lib/rules/no-nested-tests.js';
import { noPendingTestsRule } from './lib/rules/no-pending-tests.js';
import { noReturnAndCallbackRule } from './lib/rules/no-return-and-callback.js';
import { noReturnFromAsyncRule } from './lib/rules/no-return-from-async.js';
import { noSetupInDescribeRule } from './lib/rules/no-setup-in-describe.js';
import { noSiblingHooksRule } from './lib/rules/no-sibling-hooks.js';
import { noSynchronousTestsRule } from './lib/rules/no-synchronous-tests.js';
import { noTopLevelHooksRule } from './lib/rules/no-top-level-hooks.js';
import { preferArrowCallbackRule } from './lib/rules/prefer-arrow-callback.js';
import { validSuiteDescriptionRule } from './lib/rules/valid-suite-description.js';
import { validTestDescriptionRule } from './lib/rules/valid-test-description.js';

const allRules = {
    'mocha/handle-done-callback': 'error',
    'mocha/max-top-level-suites': 'error',
    'mocha/no-async-describe': 'error',
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
    'mocha/valid-suite-description': 'error',
    'mocha/valid-test-description': 'error',
    'mocha/no-empty-description': 'error',
    'mocha/consistent-spacing-between-blocks': 'error',
    'mocha/consistent-interface': ['error', { interface: 'BDD' }]
};

const recommendedRules = {
    'mocha/handle-done-callback': 'error',
    'mocha/max-top-level-suites': ['error', { limit: 1 }],
    'mocha/no-async-describe': 'error',
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
    'mocha/valid-suite-description': 'off',
    'mocha/valid-test-description': 'off',
    'mocha/no-empty-description': 'error',
    'mocha/consistent-spacing-between-blocks': 'error'
};

const mochaPlugin = {
    rules: {
        'handle-done-callback': handleDoneCallbackRule,
        'max-top-level-suites': maxTopLevelSuitesRule,
        'no-async-describe': noAsyncDescribeRule,
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
        'valid-suite-description': validSuiteDescriptionRule,
        'valid-test-description': validTestDescriptionRule,
        'no-empty-description': noEmptyDescriptionRule,
        'consistent-spacing-between-blocks': consistentSpacingBetweenBlocksRule,
        'consistent-interface': consistentInterfaceRule
    },
    configs: {
        all: {
            env: { mocha: true },
            plugins: ['mocha'],
            rules: allRules
        },
        recommended: {
            env: { mocha: true },
            plugins: ['mocha'],
            rules: recommendedRules
        }
    }
};

mochaPlugin.configs.flat = {
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
