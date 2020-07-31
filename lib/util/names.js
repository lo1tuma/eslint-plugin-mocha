'use strict';

const chain = require('ramda/src/chain');

const suiteNames = [
    'describe',
    'context',
    'suite'
];

const suiteModifiers = {
    skip: [
        'describe.skip',
        'context.skip',
        'suite.skip',
        'xdescribe',
        'xcontext',
        'xsuite'
    ],
    only: [
        'describe.only',
        'context.only',
        'suite.only'
    ]
};

const testCaseNames = [
    'it',
    'test',
    'specify'
];

const testCaseModifiers = {
    skip: [
        'it.skip',
        'test.skip',
        'specify.skip',
        'xit',
        'xspecify'
    ],
    only: [
        'it.only',
        'test.only',
        'specify.only'
    ]
};

function getTestCaseNames(options = {}) {
    const { modifiers = [], baseNames = true } = options;
    const names = baseNames ? testCaseNames : [];

    return names.concat(chain((modifierName) => {
        if (testCaseModifiers[modifierName]) {
            return testCaseModifiers[modifierName];
        }

        return [];
    }, modifiers));
}

function getSuiteNames(options = {}) {
    const { modifiers = [], baseNames = true, additionalSuiteNames = [] } = options;
    const names = baseNames ? suiteNames.concat(additionalSuiteNames) : [];

    return names.concat(chain((modifierName) => {
        if (suiteModifiers[modifierName]) {
            return suiteModifiers[modifierName];
        }

        return [];
    }, modifiers));
}

module.exports = {
    getTestCaseNames,
    getSuiteNames
};
