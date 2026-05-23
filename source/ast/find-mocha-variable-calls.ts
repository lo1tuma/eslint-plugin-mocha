/* eslint-disable import/max-dependencies -- needs to be refactored */
import type { Rule } from 'eslint';
import { reduceWithArgs } from '../list.js';
import { getAllNames } from '../mocha/all-name-details.js';
import type { MochaInterface } from '../mocha/descriptors.js';
import { type NameDetails, reformatLastPathSegmentWithCallExpressions } from '../mocha/name-details.js';
import { isSamePath } from '../mocha/path.js';
import { resolveAliasedReferences } from './alias-references.js';
import { findGlobalReferencesByName } from './find-global-references.js';
import { findImportReferencesByName } from './find-import-references.js';
import { type DynamicPath, isConstantPath } from './member-expression.js';
import { type CallExpression, isCallExpression, isMemberExpression } from './node-types.js';
import type { ResolvedReference } from './resolved-reference.js';

function isCallExpressionReference(reference: Readonly<ResolvedReference>): boolean {
    return reference.node.type === 'CallExpression';
}

function addReferenceToResults(
    results: readonly ResolvedReference[],
    matchingReference: Readonly<ResolvedReference>
): readonly ResolvedReference[] {
    return [...results, matchingReference];
}

type CallExpressionDetails = { node: CallExpression; amountOfCallExpressions: number; };

function getCallDetails(reference: Readonly<ResolvedReference>): Readonly<CallExpressionDetails> {
    let { node } = reference;
    let count = 0;

    while (node.parent.type === 'CallExpression') {
        node = node.parent;
        count += 1;
    }

    return { node, amountOfCallExpressions: count };
}

function shouldProcessReference(
    results: readonly ResolvedReference[],
    reference: Readonly<ResolvedReference>
): readonly ResolvedReference[] {
    if (isCallExpressionReference(reference)) {
        const { node: newNode, amountOfCallExpressions } = getCallDetails(reference);
        return addReferenceToResults(results, {
            ...reference,
            node: newNode,
            resolvedPath: reformatLastPathSegmentWithCallExpressions(
                reference.resolvedPath,
                amountOfCallExpressions
            )
        });
    }
    return results;
}

function findMatchingNameDetails(
    pathToMatch: DynamicPath,
    names: readonly NameDetails[]
): Readonly<NameDetails | null> {
    for (const nameDetails of names) {
        if (isSamePath(pathToMatch, nameDetails.normalizedPath)) {
            return nameDetails;
        }
    }

    return null;
}

export type ResolvedReferenceWithNameDetails = ResolvedReference & { nameDetails: NameDetails; name: string; };

// eslint-disable-next-line max-statements -- needs to be refactored
function shouldAddReferenceToResults(
    results: readonly ResolvedReferenceWithNameDetails[],
    reference: Readonly<ResolvedReference>,
    names: readonly NameDetails[]
): readonly ResolvedReferenceWithNameDetails[] {
    const nameDetails = findMatchingNameDetails(reference.resolvedPath, names);

    if (nameDetails === null) {
        return results;
    }

    const { callee } = reference.node;

    if (nameDetails.config !== null && isMemberExpression(callee) && isCallExpression(callee.object)) {
        const resolvedPath2 = reference.resolvedPath.slice(0, -1);
        const path2 = reference.path.slice(0, -1);
        const nameDetails2 = findMatchingNameDetails(resolvedPath2, names);

        if (nameDetails2 !== null) {
            return [
                ...results,
                { ...reference, nameDetails, name: reference.resolvedPath.join('.') },
                {
                    ...reference,
                    node: callee.object,
                    name: path2.join('.'),
                    path: path2,
                    resolvedPath: resolvedPath2,
                    nameDetails: nameDetails2
                }
            ];
        }
    }

    return [...results, { ...reference, nameDetails, name: reference.resolvedPath.join('.') }];
}

function isResultWithConstantPath(result: Readonly<ResolvedReference>): boolean {
    return isConstantPath(result.path);
}

type SplitCustomNames = {
    readonly exports: readonly NameDetails[];
    readonly globals: readonly NameDetails[];
};

function splitCustomNamesByInterface(customNames: readonly NameDetails[]): Readonly<SplitCustomNames> {
    return {
        exports: customNames.filter((nameDetails) => {
            return nameDetails.interface === 'exports';
        }),
        globals: customNames.filter((nameDetails) => {
            return nameDetails.interface !== 'exports';
        })
    };
}

export function findMochaVariableCalls(
    context: Readonly<Rule.RuleContext>,
    customNames: readonly NameDetails[],
    interfaceToUse: MochaInterface,
    includeAllInterfaces: boolean
): readonly ResolvedReferenceWithNameDetails[] {
    const { sourceCode } = context;
    const builtinNames = getAllNames([], interfaceToUse, includeAllInterfaces);
    const builtinReferences = interfaceToUse === 'exports'
        ? findImportReferencesByName(context, builtinNames, 'mocha')
        : findGlobalReferencesByName(context, builtinNames);
    const customNamesByInterface = splitCustomNamesByInterface(customNames);
    const customExportReferences = findImportReferencesByName(
        context,
        customNamesByInterface.exports,
        null
    );
    const customGlobalReferences = findGlobalReferencesByName(context, customNamesByInterface.globals);

    const resolvedReferences = resolveAliasedReferences(sourceCode, [
        ...builtinReferences,
        ...customExportReferences,
        ...customGlobalReferences
    ]);

    const constantResolvedReferences = reduceWithArgs(resolvedReferences, shouldProcessReference, []);

    const filteredReferences = constantResolvedReferences.filter(isResultWithConstantPath);

    return reduceWithArgs(
        filteredReferences,
        shouldAddReferenceToResults,
        [],
        [...builtinNames, ...customNames]
    );
}
