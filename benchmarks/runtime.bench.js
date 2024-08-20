const assert = require('node:assert');
const { Linter } = require('eslint');
const { times } = require('rambda');
const {
    runBenchmark,
    cpuSpeed
} = require('./measure');
const mochaPlugin = require('../');

const allRules = mochaPlugin.configs.all.rules;

function lintManyFilesWithAllRecommendedRules(options) {
    const { numberOfFiles } = options;
    const linter = new Linter();

    const config = {
        plugins: { mocha: mochaPlugin },
        rules: allRules,
        languageOptions: {
            ecmaVersion: 2018
        }
    };

    times((index) => {
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
    }, numberOfFiles);
}

const iterations = 50;

describe('runtime', function () {
    it('should not take longer as the defined budget to lint many files with the recommended config', function () {
        const cpuAgnosticBudget = 3_750_000;
        const budget = cpuAgnosticBudget / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget to lint many files with the recommended config', function () {
        const budget = 2_750_000;

        const { medianMemory } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, iterations);

        assert.strictEqual(medianMemory < budget, true);
    });
});
