'use strict';

const os = require('os');
const { performance: performanceHooks } = require('perf_hooks');
const { times, median, map, prop } = require('ramda');
const semver = require('semver');

const [ { speed: cpuSpeed } ] = os.cpus();

function getNodeVersionMultiplier() {
    const currentNodeVersion = process.version;

    if (semver.lt(currentNodeVersion, '14.0.0')) {
        return 1.5;
    }

    return 1;
}

function clearRequireCache() {
    Object.keys(require.cache).forEach(function (key) {
        delete require.cache[key];
    });
}

function runBenchmark(fn, count) {
    const results = [];

    times(() => {
        const startTime = performanceHooks.now();
        const startMemory = process.memoryUsage().rss;
        fn();
        const endTime = performanceHooks.now();
        const endMemory = process.memoryUsage().rss;
        const duration = endTime - startTime;
        const memory = endMemory - startMemory;

        results.push({ duration, memory });
    }, count);

    const medianDuration = median(map(prop('duration'), results));
    const medianMemory = median(map(prop('memory'), results));

    return { medianDuration, medianMemory };
}

module.exports = {
    runBenchmark,
    clearRequireCache,
    cpuSpeed,
    getNodeVersionMultiplier
};
