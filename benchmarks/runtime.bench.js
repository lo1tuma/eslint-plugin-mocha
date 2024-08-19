'use strict';

const assert = require('assert');
const { Linter } = require('eslint');
const { times, toPairs, fromPairs } = require('rambda');
const {
    runBenchmark,
    cpuSpeed
} = require('./measure');
const mochaPlugin = require('../');

const allRules = mochaPlugin.configs.all.rules;

function lintManyFilesWithAllRecommendedRules({ numberOfFiles }) {
    const linter = new Linter();

    linter.defineRules(mochaPlugin.rules);

    const config = {
        rules: fromPairs(
            toPairs(allRules).map(([ ruleName, ruleSettings ]) => {
                const [ , ruleNameWithoutPrefix ] = ruleName.split('/');

                return [ ruleNameWithoutPrefix, ruleSettings ];
            })
        ),
        parserOptions: {
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

describe('runtime', () => {
    it('should not take longer as the defined budget to lint many files with the recommended config', () => {
        const budget = 3750000 / cpuSpeed;

        const { medianDuration } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, 50);

        assert.strictEqual(medianDuration < budget, true);
    });

    it('should not consume more memory as the defined budget to lint many files with the recommended config', () => {
        const budget = 2750000;

        const { medianMemory } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, 50);

        assert.strictEqual(medianMemory < budget, true);
    });
});
