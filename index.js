'use strict';

module.exports = {
    rules: {
        'no-exclusive-tests': require('./lib/rules/no-exclusive-tests'),
        'no-pending-tests': require('./lib/rules/no-pending-tests'),
        'no-skipped-tests': require('./lib/rules/no-skipped-tests'),
        'handle-done-callback': require('./lib/rules/handle-done-callback'),
        'no-synchronous-tests': require('./lib/rules/no-synchronous-tests'),
        'no-global-tests': require('./lib/rules/no-global-tests')
    }
};
