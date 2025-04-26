import os from 'node:os';
import { performance as performanceHooks } from 'node:perf_hooks';

const [{ speed: cpuSpeed = 0 } = {}] = os.cpus();

export { cpuSpeed };

export async function importFresh(modulePath: string): Promise<void> {
    const cacheBuster = `${performanceHooks.now()}_${Math.random()}`;
    const cacheBustingModulePath = `${modulePath}?buster=${cacheBuster}`;

    await import(cacheBustingModulePath);
}

function isPositiveNumber(value: number): boolean {
    return value > 0;
}

type Result = {
    readonly duration: number;
    readonly memory: number;
};

type MedianResult = {
    readonly medianDuration: number;
    readonly medianMemory: number;
};

function median(list: readonly number[]): number {
    const listParts = 2;
    const medianIndex = Math.floor(list.length / listParts);
    const lowerValue = list[medianIndex - 1] ?? 0;
    const upperValue = list[medianIndex] ?? 0;

    if (list.length % listParts === 0) {
        return (lowerValue + upperValue) / listParts;
    }

    return upperValue;
}

export function runSyncBenchmark(fn: () => void, count: number): Readonly<MedianResult> {
    const results: Result[] = [];

    Array.from({ length: count }).forEach(() => {
        const startTime = performanceHooks.now();
        const startMemory = process.memoryUsage.rss();
        fn();
        const endTime = performanceHooks.now();
        const endMemory = process.memoryUsage.rss();
        const duration = endTime - startTime;
        const memory = endMemory - startMemory;

        results.push({ duration, memory });
    });

    const medianDuration = median(results.map((result) => {
        return result.duration;
    }));
    const medianMemory = median(
        results
            .map((result) => {
                return result.memory;
            })
            .filter(isPositiveNumber)
    );

    return { medianDuration, medianMemory };
}

async function measureSingleAsyncTask(fn: () => Promise<void>): Promise<Result> {
    const startTime = performanceHooks.now();
    const startMemory = process.memoryUsage().rss;
    await fn();
    const endTime = performanceHooks.now();
    const endMemory = process.memoryUsage().rss;
    const duration = endTime - startTime;
    const memory = endMemory - startMemory;

    return { duration, memory };
}

export async function runAsyncBenchmark(fn: () => Promise<void>, count: number): Promise<MedianResult> {
    const results = [];

    for (let iteration = 0; iteration < count; iteration += 1) {
        const result = await measureSingleAsyncTask(fn);
        results.push(result);
    }

    const medianDuration = median(results.map((result) => {
        return result.duration;
    }));
    const medianMemory = median(
        results
            .map((result) => {
                return result.memory;
            })
            .filter(isPositiveNumber)
    );

    return { medianDuration, medianMemory };
}
