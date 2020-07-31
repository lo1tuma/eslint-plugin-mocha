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

function getSuiteModifiers(modifierName, additionalSuiteModifiers = {}) {
    const names = suiteModifiers[modifierName] || [];
    const additionalNames = additionalSuiteModifiers[modifierName] || [];

    return [ ...names, ...additionalNames ];
}

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

function getTestCaseModifiers(modifierName, additionalTestCaseModifiers = {}) {
    const names = testCaseModifiers[modifierName] || [];
    const additionalNames = additionalTestCaseModifiers[modifierName] || [];

    return [ ...names, ...additionalNames ];
}

function getTestCaseNames(options = {}) {
    const { modifiers = [], baseNames = true, additionalTestCaseNames = [], additionalTestCaseModifiers } = options;
    const names = baseNames ? testCaseNames.concat(additionalTestCaseNames) : [];

    return names.concat(chain((modifierName) => {
        return getTestCaseModifiers(modifierName, additionalTestCaseModifiers);
    }, modifiers));
}

function getSuiteNames(options = {}) {
    const { modifiers = [], baseNames = true, additionalSuiteNames = [], additionalSuiteModifiers } = options;
    const names = baseNames ? suiteNames.concat(additionalSuiteNames) : [];

    return names.concat(chain((modifierName) => {
        return getSuiteModifiers(modifierName, additionalSuiteModifiers);
    }, modifiers));
}

module.exports = {
    getTestCaseNames,
    getSuiteNames
};
