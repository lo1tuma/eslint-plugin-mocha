import type { Rule } from 'eslint';
import { reduceWithArgs } from '../list.js';
import { reformatLastPathSegmentWithCallExpressions, type NameDetails } from '../mocha/name-details.js';
import { isSamePath } from '../mocha/path.js';
import { resolveAliasedReferences } from './alias-references.js';
import { findGlobalReferencesByName } from './find-global-references.js';
import { findImportReferencesByName } from './find-import-references.js';
import { isConstantPath, type DynamicPath } from './member-expression.js';
import type { ResolvedReference } from './resolved-reference.js';
import { isMemberExpression, isCallExpression, type CallExpression} from './node-types.js';
import type { MochaInterface } from '../mocha/descriptors.js';

function isCallExpressionReference(reference: ResolvedReference): boolean  {
    return reference.node.type === 'CallExpression';
}

function addReferenceToResults(results: readonly ResolvedReference[], matchingReference: ResolvedReference): readonly ResolvedReference[] {
    return [...results, matchingReference];
}

type CallExpressionDetails = { node: CallExpression, amountOfCallExpressions: number }

function getCallDetails(reference: ResolvedReference): CallExpressionDetails {
    let { node } = reference;
    let count = 0;

    while (node.parent.type === 'CallExpression') {
        node = node.parent;
        count += 1;
    }

    return { node, amountOfCallExpressions: count };
}

function shouldProcessReference(results: readonly ResolvedReference[], reference: ResolvedReference): readonly ResolvedReference[] {
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

function findMatchingNameDetails(pathToMatch: DynamicPath, names: readonly NameDetails[]): NameDetails | null {
    for (const nameDetails of names) {
        if (isSamePath(pathToMatch, nameDetails.normalizedPath)) {
            return nameDetails;
        }
    }

    return null;
}

export type ResolvedReferenceWithNameDetails = ResolvedReference & { nameDetails: NameDetails, name: string }

function shouldAddReferenceToResults(results: readonly ResolvedReferenceWithNameDetails[], reference: ResolvedReference, names: readonly NameDetails[]): readonly ResolvedReferenceWithNameDetails[] {
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

function isResultWithConstantPath(result: ResolvedReference): boolean {
    return isConstantPath(result.path);
}

export function findMochaVariableCalls(context: Rule.RuleContext, names: readonly NameDetails[], interfaceToUse: MochaInterface): readonly ResolvedReferenceWithNameDetails[] {
    const { sourceCode } = context;
    const references = interfaceToUse === 'exports'
        ? findImportReferencesByName(context, names, 'mocha')
        : findGlobalReferencesByName(context, names);

    const resolvedReferences = resolveAliasedReferences(sourceCode, references);

    const constantResolvedReferences = reduceWithArgs(resolvedReferences, shouldProcessReference, []);

    const filteredReferences = constantResolvedReferences.filter(isResultWithConstantPath);

    return reduceWithArgs(
        filteredReferences,
        shouldAddReferenceToResults,
        [],
        names
    );
}
