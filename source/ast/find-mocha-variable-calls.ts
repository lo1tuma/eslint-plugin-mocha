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

type CallResolvedReference = ResolvedReference & {
    readonly node: CallExpression;
};

function addReferenceToResults(
    results: readonly CallResolvedReference[],
    matchingReference: Readonly<CallResolvedReference>
): readonly CallResolvedReference[] {
    return [ ...results, matchingReference ];
}

type CallExpressionDetails = { readonly node: CallExpression; readonly amountOfCallExpressions: number; };

function getCallDetails(reference: Readonly<CallResolvedReference>): Readonly<CallExpressionDetails> {
    let { node } = reference;
    let count = 0;

    while (node.parent.type === 'CallExpression') {
        node = node.parent;
        count += 1;
    }

    return { node, amountOfCallExpressions: count };
}

function shouldProcessReference(
    results: readonly CallResolvedReference[],
    reference: Readonly<ResolvedReference>
): readonly CallResolvedReference[] {
    if (!isCallExpression(reference.node)) {
        return results;
    }

    const callReference: CallResolvedReference = {
        ...reference,
        node: reference.node
    };
    const { node: newNode, amountOfCallExpressions } = getCallDetails(callReference);
    return addReferenceToResults(results, {
        ...callReference,
        node: newNode,
        resolvedPath: reformatLastPathSegmentWithCallExpressions(
            reference.resolvedPath,
            amountOfCallExpressions
        )
    });
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

export type ResolvedReferenceWithNameDetails = ResolvedReference & {
    readonly nameDetails: NameDetails;
    readonly name: string;
    readonly node: CallExpression;
};

// eslint-disable-next-line max-statements -- needs to be refactored
function shouldAddReferenceToResults(
    results: readonly ResolvedReferenceWithNameDetails[],
    reference: Readonly<CallResolvedReference>,
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

    return [ ...results, { ...reference, nameDetails, name: reference.resolvedPath.join('.') } ];
}

function isResultWithConstantPath(result: Readonly<ResolvedReference>): boolean {
    return isConstantPath(result.path);
}

type SplitCustomNames = {
    readonly require: readonly NameDetails[];
    readonly globals: readonly NameDetails[];
};

function splitCustomNamesByInterface(customNames: readonly NameDetails[]): Readonly<SplitCustomNames> {
    return {
        require: customNames.filter(function (nameDetails) {
            return nameDetails.interface === 'require';
        }),
        globals: customNames.filter(function (nameDetails) {
            return nameDetails.interface !== 'require';
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
    const builtinReferences = interfaceToUse === 'require'
        ? findImportReferencesByName(context, builtinNames, 'mocha')
        : findGlobalReferencesByName(context, builtinNames);
    const customNamesByInterface = splitCustomNamesByInterface(customNames);
    const customRequireReferences = findImportReferencesByName(
        context,
        customNamesByInterface.require,
        null
    );
    const customGlobalReferences = findGlobalReferencesByName(context, customNamesByInterface.globals);

    const resolvedReferences = resolveAliasedReferences(sourceCode, [
        ...builtinReferences,
        ...customRequireReferences,
        ...customGlobalReferences
    ]);

    const constantResolvedReferences = reduceWithArgs(resolvedReferences, shouldProcessReference, []);

    const filteredReferences = constantResolvedReferences.filter(isResultWithConstantPath);

    return reduceWithArgs(
        filteredReferences,
        shouldAddReferenceToResults,
        [],
        [ ...builtinNames, ...customNames ]
    );
}
