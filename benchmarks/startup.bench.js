const assert = require('node:assert');
const { runBenchmark, cpuSpeed, clearRequireCache } = require('./measure');

const iterations = 50;

describe('startup / require time', function () {
    it('should not take longer as the defined budget to require the plugin', function () {
        const cpuAgnosticBudget = 85_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, iterations);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget', function () {
        const budget = 600_000;

        const { medianMemory } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, iterations);

        assert.strictEqual(medianMemory < budget, true);
    });
});
