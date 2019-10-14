'use strict';

const os = require('os');
const { expect } = require('chai');
const { performance } = require('perf_hooks');

const [ { speed: cpuSpeed } ] = os.cpus();

describe('startup / require time', () => {
    it('should not take longer as the defined budget to require the plugin', () => {
        const budget = 85000 / cpuSpeed;

        const startTime = performance.now();
        require('../index');
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        expect(loadTime).to.be.below(budget);
    });
});
