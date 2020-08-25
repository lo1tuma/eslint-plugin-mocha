'use strict';

const { expect } = require('chai');
const { runBenchmark, cpuSpeed, clearRequireCache } = require('./measure');

describe('startup / require time', () => {
    it('should not take longer as the defined budget to require the plugin', () => {
        const budget = 85000 / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        expect(medianDuration).to.be.below(budget);
    });

    it('should not consume more memory as the defined budget', () => {
        const budget = 600000;

        const { medianMemory } = runBenchmark(() => {
            clearRequireCache();
            require('../index');
        }, 50);

        expect(medianMemory).to.be.below(budget);
    });
});
