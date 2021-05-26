'use strict';

const { expect } = require('chai');
const { Linter } = require('eslint');
const times = require('ramda/src/times');
const toPairs = require('ramda/src/toPairs');
const fromPairs = require('ramda/src/fromPairs');
const {
    runBenchmark,
    cpuSpeed,
    getNodeVersionMultiplier
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
        const nodeVersionMultiplier = getNodeVersionMultiplier();
        const budget = 7000000 / cpuSpeed * nodeVersionMultiplier;

        const { medianDuration } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, 5);

        expect(medianDuration).to.be.below(budget);
    });

    it('should not consume more memory as the defined budget to lint many files with the recommended config', () => {
        const budget = 3000000;

        const { medianMemory } = runBenchmark(() => {
            lintManyFilesWithAllRecommendedRules({ numberOfFiles: 350 });
        }, 5);

        expect(medianMemory).to.be.below(budget);
    });
});
