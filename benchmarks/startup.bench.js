'use strict';

const assert = require('assert');
const { runBenchmark, cpuSpeed, clearRequireCache } = require('./measure');

describe('startup / require time', () => {
    it('should not take longer as the defined budget to require the plugin', () => {
        const budget = 85000 / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget', () => {
        const budget = 600000;

        const { medianMemory } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        assert.strictEqual(medianMemory < budget, true);
    });
});
