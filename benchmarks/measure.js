import os from 'node:os';
import { performance as performanceHooks } from 'node:perf_hooks';
import { filter, lte as isLowerThanOrEquals, map, median, prop, times } from 'rambda';

const [{ speed: cpuSpeed }] = os.cpus();

export { cpuSpeed };

export async function importFresh(modulePath) {
    const cacheBuster = `${performanceHooks.now()}_${Math.random()}`;
    const cacheBustingModulePath = `${modulePath}?buster=${cacheBuster}`;

    await import(cacheBustingModulePath);
}

const isPositiveNumber = isLowerThanOrEquals(0);

export function runSyncBenchmark(fn, count) {
    const results = [];

    times(() => {
        const startTime = performanceHooks.now();
        const startMemory = process.memoryUsage.rss();
        fn();
        const endTime = performanceHooks.now();
        const endMemory = process.memoryUsage.rss();
        const duration = endTime - startTime;
        const memory = endMemory - startMemory;

        results.push({ duration, memory });
    }, count);

    const medianDuration = median(map(prop('duration'), results));
    const medianMemory = median(filter(isPositiveNumber, map(prop('memory'), results)));

    return { medianDuration, medianMemory };
}

async function measureSingleAsyncTask(fn) {
    const startTime = performanceHooks.now();
    const startMemory = process.memoryUsage().rss;
    await fn();
    const endTime = performanceHooks.now();
    const endMemory = process.memoryUsage().rss;
    const duration = endTime - startTime;
    const memory = endMemory - startMemory;

    return { duration, memory };
}

export async function runAsyncBenchmark(fn, count) {
    const results = [];

    for (let iteration = 0; iteration < count; iteration += 1) {
        const result = await measureSingleAsyncTask(fn);
        results.push(result);
    }

    const medianDuration = median(map(prop('duration'), results));
    const medianMemory = median(filter(isPositiveNumber, map(prop('memory'), results)));

    return { medianDuration, medianMemory };
}
