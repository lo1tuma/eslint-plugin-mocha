import assert from 'node:assert';
import { cpuSpeed, importFresh, runAsyncBenchmark } from './measure.js';

const iterations = 50;

describe('startup / require time', function () {
    it('should not take longer as the defined budget to require the plugin', async function () {
        const cpuAgnosticBudget = 20_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = await runAsyncBenchmark(async () => {
            await importFresh('../index.js');
        }, iterations);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget', async function () {
        const budget = 50_000;

        const { medianMemory } = await runAsyncBenchmark(async () => {
            await importFresh('../index.js');
        }, iterations);

        assert.strictEqual(medianMemory < budget, true);
    });
});
