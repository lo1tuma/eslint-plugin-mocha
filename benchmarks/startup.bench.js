'use strict';

const os = require('os');
const { expect } = require('chai');
const { performance } = require('perf_hooks');
const times = require('ramda/src/times');
const median = require('ramda/src/median');
const map = require('ramda/src/map');
const prop = require('ramda/src/prop');

const [ { speed: cpuSpeed } ] = os.cpus();

function clearRequireCache() {
    Object.keys(require.cache).forEach(function (key) {
        delete require.cache[key];
    });
}

function runBenchmark(fn, count) {
    const results = [];

    times(() => {
        const startTime = performance.now();
        const startMemory = process.memoryUsage().rss;
        fn();
        const endTime = performance.now();
        const endMemory = process.memoryUsage().rss;
        const duration = endTime - startTime;
        const memory = endMemory - startMemory;

        results.push({ duration, memory });
    }, count);

    const medianDuration = median(map(prop('duration'), results));
    const medianMemory = median(map(prop('memory'), results));

    return { medianDuration, medianMemory };
}

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
