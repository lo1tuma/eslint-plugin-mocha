import { type DynamicPath, isConstantPath } from '../ast/member-expression.js';
import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import {
    configCallNames,
    type MochaConfigCall,
    type MochaEntityType,
    type MochaInterface,
    type NameDetailsConfig
} from './descriptors.js';

function hasMatchingType(item: Readonly<NameDetailsConfig>, typesToMatch: readonly MochaEntityType[]): boolean {
    return typesToMatch.includes(item.type);
}

const testCaseAndSuite = ['testCase', 'suite'] as const;
function filterTestCasesAndSuites(nameDetailsList: readonly NameDetailsConfig[]): readonly NameDetailsConfig[] {
    return filterWithArgs(nameDetailsList, hasMatchingType, testCaseAndSuite);
}

function hasMatchingInterface(item: Readonly<NameDetailsConfig>, interfaceToMatch: MochaInterface): boolean {
    return interfaceToMatch === item.interface;
}

function filterByInterface(
    nameDetailsList: readonly NameDetailsConfig[],
    interfaceToMatch: MochaInterface
): readonly NameDetailsConfig[] {
    return filterWithArgs(nameDetailsList, hasMatchingInterface, interfaceToMatch);
}

function formatXVariant(nameDetails: Readonly<NameDetailsConfig>): Readonly<NameDetailsConfig> {
    const [firstPathSegment, ...remainingPath] = nameDetails.path;
    return {
        ...nameDetails,
        path: [`x${firstPathSegment}`, ...remainingPath],
        modifier: 'pending'
    };
}

function buildXVariants(nameDetailsList: readonly NameDetailsConfig[]): readonly NameDetailsConfig[] {
    const testCasesAndSuites = filterTestCasesAndSuites(nameDetailsList);
    return filterByInterface(testCasesAndSuites, 'BDD').map(formatXVariant);
}

function formatSkipVariant(nameDetails: Readonly<NameDetailsConfig>): Readonly<NameDetailsConfig> {
    return {
        ...nameDetails,
        path: [...nameDetails.path, 'skip'],
        modifier: 'pending'
    };
}

function buildSkipVariants(nameDetailsList: readonly NameDetailsConfig[]): readonly NameDetailsConfig[] {
    const testCasesAndSuites = filterTestCasesAndSuites(nameDetailsList);
    return testCasesAndSuites.map(formatSkipVariant);
}

function formatExclusiveVariants(nameDetails: Readonly<NameDetailsConfig>): Readonly<NameDetailsConfig> {
    return {
        ...nameDetails,
        path: [...nameDetails.path, 'only'],
        modifier: 'exclusive'
    };
}

function buildExclusiveVariants(nameDetailsList: readonly NameDetailsConfig[]): readonly NameDetailsConfig[] {
    const testCasesAndSuites = filterTestCasesAndSuites(nameDetailsList);
    return testCasesAndSuites.map(formatExclusiveVariants);
}

export type NameDetails = NameDetailsConfig & {
    normalizedPath: DynamicPath;
};

function formatConfigVariant(nameDetails: Readonly<NameDetails>, config: MochaConfigCall): Readonly<NameDetails> {
    return {
        ...nameDetails,
        config,
        type: 'config',
        path: [...nameDetails.path, config],
        normalizedPath: [...nameDetails.normalizedPath, `${config}()`]
    };
}

function buildConfigVariantsForConfig(
    config: MochaConfigCall,
    nameDetailsList: readonly NameDetails[]
): readonly NameDetails[] {
    return mapWithArgs(nameDetailsList, formatConfigVariant, config);
}

function buildConfigVariants(nameDetailsList: readonly NameDetails[]): readonly NameDetails[] {
    return flatMapWithArgs(configCallNames, buildConfigVariantsForConfig, nameDetailsList);
}

const callExpressionSuffix = '()';

export function reformatLastPathSegmentWithCallExpressions(
    path: DynamicPath,
    amountOfCallExpressions: number
): DynamicPath {
    if (!isConstantPath(path)) {
        return path;
    }
    const mutablePath = Array.from(path);
    const segment = mutablePath.pop();
    const suffix = callExpressionSuffix.repeat(amountOfCallExpressions);

    return [...mutablePath, `${segment}${suffix}`];
}

export function stripCallExpressions(path: readonly string[]): readonly string[] {
    return path.map((segment) => {
        if (segment.endsWith(callExpressionSuffix)) {
            return segment.slice(0, -callExpressionSuffix.length);
        }
        return segment;
    });
}

function normalizePathForNameDetails(nameDetails: Readonly<NameDetailsConfig>): Readonly<NameDetails> {
    return {
        ...nameDetails,
        normalizedPath: reformatLastPathSegmentWithCallExpressions(nameDetails.path, 1),
        path: stripCallExpressions(nameDetails.path)
    };
}

export function buildAllNameDetailsWithVariants(
    baseNameDetailsList: readonly NameDetailsConfig[]
): readonly NameDetails[] {
    const allNameDetails = [
        ...baseNameDetailsList,
        ...buildSkipVariants(baseNameDetailsList),
        ...buildXVariants(baseNameDetailsList),
        ...buildExclusiveVariants(baseNameDetailsList)
    ];
    const allNormalizedNameDetails = allNameDetails.map(normalizePathForNameDetails);

    return [...allNormalizedNameDetails, ...buildConfigVariants(allNormalizedNameDetails)];
}
