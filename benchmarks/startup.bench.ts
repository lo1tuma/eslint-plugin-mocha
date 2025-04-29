import assert from 'node:assert';
import { cpuSpeed, importFresh, runAsyncBenchmark } from './measure.js';

const iterations = 50;

describe('startup / require time', function () {
    it('should not take longer as the defined budget to require the plugin', async function () {
        const cpuAgnosticBudget = 20_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = await runAsyncBenchmark(async () => {
            await importFresh('../source/plugin.js');
        }, iterations);

        assert.strictEqual(
            medianDuration < budget,
            true,
            `Expected duration ${medianDuration} to be lower than budget ${budget}`
        );
    });

    it('should not consume more memory as the defined budget', async function () {
        const budget = 450_000;

        const { medianMemory } = await runAsyncBenchmark(async () => {
            await importFresh('../source/plugin.js');
        }, iterations);

        assert.strictEqual(
            medianMemory < budget,
            true,
            `Expected memory ${medianMemory} to be lower than budget ${budget}`
        );
    });
});
