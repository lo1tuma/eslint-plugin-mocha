import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import { configCallNames, INTERFACES, MODIFIERS, TYPES } from './descriptors.js';

function hasMatchingType(typesToMatch, item) {
    return typesToMatch.includes(item.type);
}

const testCaseAndSuite = [TYPES.testCase, TYPES.suite];
function filterTestCasesAndSuites(nameDetailsList) {
    return filterWithArgs(nameDetailsList, hasMatchingType, testCaseAndSuite);
}

function hasMatchingInterface(interfaceToMatch, item) {
    return interfaceToMatch === item.interface;
}

function filterByInterface(nameDetailsList, interfaceToMatch) {
    return filterWithArgs(nameDetailsList, hasMatchingInterface, interfaceToMatch);
}

function formatXVariant(nameDetails) {
    const [firstPathSegment, ...remainingPath] = nameDetails.path;
    return {
        ...nameDetails,
        path: [`x${firstPathSegment}`, ...remainingPath],
        modifier: MODIFIERS.pending
    };
}

function buildXVariants(nameDetailsList) {
    const testCasesAndSuites = filterTestCasesAndSuites(nameDetailsList);
    return filterByInterface(testCasesAndSuites, INTERFACES.BDD).map(formatXVariant);
}

function formatSkipVariant(nameDetails) {
    return {
        ...nameDetails,
        path: [...nameDetails.path, 'skip'],
        modifier: MODIFIERS.pending
    };
}

function buildSkipVariants(names) {
    const testCasesAndSuites = filterTestCasesAndSuites(names);
    return testCasesAndSuites.map(formatSkipVariant);
}

function formatExclusiveVariants(nameDetails) {
    return {
        ...nameDetails,
        path: [...nameDetails.path, 'only'],
        modifier: MODIFIERS.exclusive
    };
}

function buildExclusiveVariants(names) {
    const testCasesAndSuites = filterTestCasesAndSuites(names);
    return testCasesAndSuites.map(formatExclusiveVariants);
}

function formatConfigVariant(config, nameDetails) {
    return {
        ...nameDetails,
        config,
        type: TYPES.config,
        path: [...nameDetails.path, config],
        normalizedPath: [...nameDetails.normalizedPath, `${config}()`]
    };
}

function buildConfigVariantsForConfig(nameDetailsList, config) {
    return mapWithArgs(nameDetailsList, formatConfigVariant, config);
}

function buildConfigVariants(nameDetailsList) {
    return flatMapWithArgs(configCallNames, buildConfigVariantsForConfig, nameDetailsList);
}

const callExpressionSuffix = '()';

export function reformatLastPathSegmentWithCallExpressions(path, amountOfCallExpressions) {
    const mutablePath = Array.from(path);
    const segment = mutablePath.pop();
    const suffix = callExpressionSuffix.repeat(amountOfCallExpressions);

    return [...mutablePath, `${segment}${suffix}`];
}

export function stripCallExpressions(path) {
    return path.map((segment) => {
        if (segment.endsWith(callExpressionSuffix)) {
            return segment.slice(0, -callExpressionSuffix.length);
        }
        return segment;
    });
}

function normalizePathForNameDetails(nameDetails) {
    return {
        ...nameDetails,
        normalizedPath: reformatLastPathSegmentWithCallExpressions(nameDetails.path, 1),
        path: stripCallExpressions(nameDetails.path)
    };
}

export function buildAllNameDetailsWithVariants(baseNameDetailsList) {
    const allNameDetails = [
        ...baseNameDetailsList,
        ...buildSkipVariants(baseNameDetailsList),
        ...buildXVariants(baseNameDetailsList),
        ...buildExclusiveVariants(baseNameDetailsList)
    ];
    const allNormalizedNameDetails = allNameDetails.map(normalizePathForNameDetails);

    return [...allNormalizedNameDetails, ...buildConfigVariants(allNormalizedNameDetails)];
}
