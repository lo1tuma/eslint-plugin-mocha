'use strict';

module.exports = {
    rules: {
        'no-exclusive-tests': require('./lib/rules/no-exclusive-tests'),
        'no-pending-tests': require('./lib/rules/no-pending-tests'),
        'no-skipped-tests': require('./lib/rules/no-skipped-tests'),
        'handle-done-callback': require('./lib/rules/handle-done-callback'),
        'no-synchronous-tests': require('./lib/rules/no-synchronous-tests'),
        'no-global-tests': require('./lib/rules/no-global-tests'),
        'valid-test-description': require('./lib/rules/valid-test-description'),
        'valid-suite-description': require('./lib/rules/valid-suite-description'),
        'no-mocha-arrows': require('./lib/rules/no-mocha-arrows'),
        'no-hooks': require('./lib/rules/no-hooks'),
        'no-sibling-hooks': require('./lib/rules/no-sibling-hooks')
    },
    configs: {
        recommended: {
            rules: {
                'mocha/no-exclusive-tests': 2
            }
        }
    }
};
