import { reduceWithArgs } from '../list.js';
import { reformatLastPathSegmentWithCallExpressions } from '../mocha/name-details.js';
import { isSamePath } from '../mocha/path.js';
import { resolveAliasedReferences } from './alias-references.js';
import { findGlobalReferencesByName } from './find-global-references.js';
import { findImportReferencesByName } from './find-import-references.js';
import { isConstantPath } from './member-expression.js';

function isCallExpression(reference) {
    return reference.node.type === 'CallExpression';
}

function addReferenceToResults(results, matchingReference) {
    return [...results, matchingReference];
}

function getNode(reference) {
    let { node } = reference;
    let count = 0;

    while (node.parent.type === 'CallExpression') {
        node = node.parent;
        count += 1;
    }

    return { node, amountOfCallExpressions: count };
}

function shouldProcessReference(results, reference) {
    if (isCallExpression(reference)) {
        const { node: newNode, amountOfCallExpressions } = getNode(reference);
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

function findMatchingNameDetails(pathToMatch, names) {
    for (const nameDetails of names) {
        if (isSamePath(pathToMatch, nameDetails.normalizedPath)) {
            return nameDetails;
        }
    }

    return null;
}

function shouldAddReferenceToResults(names, results, reference) {
    const nameDetails = findMatchingNameDetails(reference.resolvedPath, names);

    if (nameDetails === null) {
        return results;
    }

    if (nameDetails.config !== null && reference.node.callee.object?.type === 'CallExpression') {
        const resolvedPath2 = reference.resolvedPath.slice(0, -1);
        const path2 = reference.path.slice(0, -1);
        const nameDetails2 = findMatchingNameDetails(resolvedPath2, names);

        if (nameDetails2 !== null) {
            return [
                ...results,
                { ...reference, nameDetails },
                {
                    ...reference,
                    node: reference.node.callee.object,
                    name: path2.join('.'),
                    path: path2,
                    resolvedPath: resolvedPath2,
                    nameDetails: nameDetails2
                }
            ];
        }
    }

    return [...results, { ...reference, nameDetails }];
}

function isResultWithConstantPath(result) {
    return isConstantPath(result.path);
}

export function findMochaVariableCalls(context, names, interfaceToUse) {
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
