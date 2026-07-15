import assert from 'node:assert';
import { suite, test } from 'mocha';
import { cpuSpeed, importFresh, runAsyncBenchmark } from './measure.ts';

const iterations = 50;

suite('startup / require time', function () {
    test('should not take longer as the defined budget to require the plugin', async function () {
        const cpuAgnosticBudget = 20_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = await runAsyncBenchmark(async function () {
            await importFresh('../source/plugin.js');
        }, iterations);

        assert.strictEqual(
            medianDuration < budget,
            true,
            `Expected duration ${medianDuration} to be lower than budget ${budget}`
        );
    });

    test('should not consume more memory as the defined budget', async function () {
        const budget = 900_000;

        const { medianMemory } = await runAsyncBenchmark(async function () {
            await importFresh('../source/plugin.js');
        }, iterations);

        assert.strictEqual(
            medianMemory < budget,
            true,
            `Expected memory ${medianMemory} to be lower than budget ${budget}`
        );
    });
});
