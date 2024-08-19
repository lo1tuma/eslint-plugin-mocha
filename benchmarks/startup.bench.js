const assert = require('node:assert');
const { runBenchmark, cpuSpeed, clearRequireCache } = require('./measure');

describe('startup / require time', function () {
    it('should not take longer as the defined budget to require the plugin', function () {
        const budget = 85_000 / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget', function () {
        const budget = 600_000;

        const { medianMemory } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        assert.strictEqual(medianMemory < budget, true);
    });
});
