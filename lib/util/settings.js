'use strict';

function settingFor(settings, propertyName, fallback) {
    const value = settings[`mocha/${propertyName}`];
    const mochaSettings = settings.mocha || {};

    return value || mochaSettings[propertyName] || fallback;
}

module.exports = {
    getAddtionalNames(settings) {
        const additionalCustomNamesSettings = settingFor(settings, 'additionalCustomNames', {});
        const {
            suites = [],
            testCases = [],
            suitesWithSkipModifier = [],
            testCasesWithSkipModifier = [],
            exclusiveTestCases = [],
            exclusiveSuites = []
        } = additionalCustomNamesSettings;

        return {
            additionalSuiteNames: suites,
            additionalTestCaseNames: testCases,
            additionalTestCaseModifiers: {
                skip: testCasesWithSkipModifier,
                only: exclusiveTestCases
            },
            additionalSuiteModifiers: {
                skip: suitesWithSkipModifier,
                only: exclusiveSuites
            }
        };
    }
};
