import { Linter } from 'eslint';
import assert from 'node:assert';
import mochaPlugin from '../source/plugin.js';
import { cpuSpeed, runSyncBenchmark } from './measure.js';

const { configs: { all } = {} } = mochaPlugin;

type Options = {
    readonly numberOfFiles: number;
};

function lintManyFilesWithAllRecommendedRules(options: Readonly<Options>): void {
    const { numberOfFiles } = options;
    const linter = new Linter();

    const config: Linter.Config[] = [all as Linter.Config, {
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2018
        }
    }];

    Array.from({ length: numberOfFiles }).forEach((_value, index) => {
        const codeToLint = `
            'use strict';
            const assert = require('assert');
            const sinon = require('sinon');
            const sut = require('./sut');

            describe('SUT ${index}', function () {
                let fooStub;

                before(() => {
                    fooStub = sinon.stub(sut, 'foo');
                });

                after(() => {
                    fooStub.restore();
                });

                beforeEach(function (done) {
                    done();
                });

                afterEach(() => {
                    fooStub.reset();
                });

                it('should work', async function () {
                    const bar = {};

                    await sut(bar);

                    assert(fooStub.callCount === 42);
                });

                describe('nested suite', async () => {
                    beforeEach(async function () {
                        await sleep(200);
                    });

                    xit('doesn’t work yet', function () {
                        sut();
                    });
                });

                context('more context', function () {
                    it.only('only here it works', () => {
                        sut();
                        assert(true);
                    });
                });
            });
        `;

        linter.verify(codeToLint, config);
    });
}

const iterations = 50;

describe('runtime', function () {
    it('should not take longer as the defined budget to lint many files with the recommended config', function () {
        const cpuAgnosticBudget = 3_250_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = runSyncBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(
            medianDuration < budget,
            true,
            `Expected duration ${medianDuration} to be lower than budget ${budget}`
        );
    });

    it('should not consume more memory as the defined budget to lint many files with the recommended config', function () {
        const budget = 5_500_000;

        const { medianMemory } = runSyncBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(
            medianMemory < budget,
            true,
            `Expected memory ${medianMemory} to be lower than budget ${budget}`
        );
    });
});
