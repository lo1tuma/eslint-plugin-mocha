import assert from 'node:assert';
import { Linter } from 'eslint';
import { suite, test } from 'mocha';
import mochaPlugin from '../source/plugin.js';
import { cpuSpeed, runSyncBenchmark } from './measure.js';

const { configs: { all } } = mochaPlugin;

type Options = {
    readonly numberOfFiles: number;
};

function lintManyFilesWithAllRecommendedRules(options: Readonly<Options>): void {
    const { numberOfFiles } = options;
    const linter = new Linter();

    const config: Linter.Config[] = [ all, {
        languageOptions: {
            sourceType: 'script',
            ecmaVersion: 2018
        }
    } ];

    Array.from({ length: numberOfFiles }).forEach(function (_value, index) {
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

suite('runtime', function () {
    test('should not take longer as the defined budget to lint many files with the recommended config', function () {
        const cpuAgnosticBudget = 2_325_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = runSyncBenchmark(function () {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(
            medianDuration < budget,
            true,
            `Expected duration ${medianDuration} to be lower than budget ${budget}`
        );
    });

    test('should not consume more memory as the defined budget to lint many files with the recommended config', function () {
        const budget = 4_250_000;

        const { medianMemory } = runSyncBenchmark(function () {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(
            medianMemory < budget,
            true,
            `Expected memory ${medianMemory} to be lower than budget ${budget}`
        );
    });
});
