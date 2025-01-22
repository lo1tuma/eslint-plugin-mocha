import { findVariable } from '@eslint-community/eslint-utils';
import { flatMapWithArgs, mapWithArgs } from '../list.js';
import { extractMemberExpressionPath, isConstantPath } from './member-expression.js';
import { findParentNodeAndPathForIdentifier } from './resolved-reference.js';

function isAliasConstAssignment(node) {
    if (node.type === 'VariableDeclarator' && node.parent.type === 'VariableDeclaration') {
        return node.parent.kind === 'const';
    }
    return false;
}

function extractIdentifiersFromObjectPattern(node, currentPath) {
    return node.properties.flatMap((property) => {
        if (property.value.type === 'Identifier') {
            return [{ identifier: property.value, path: [...currentPath, property.key.name] }];
        }
        if (property.value.type === 'ObjectPattern') {
            return extractIdentifiersFromObjectPattern(property.value, [...currentPath, property.key.name]);
        }

        return [];
    });
}

function getDeclaredIdentifiers(sourceCode, node) {
    const path = extractMemberExpressionPath(sourceCode, node.init);

    if (node.id.type === 'Identifier') {
        return [{ identifier: node.id, fullPath: path, leftHandSidePath: [], rightHandSidePath: path }];
    }

    if (node.id.type === 'ObjectPattern') {
        const allPatternIdentifiers = extractIdentifiersFromObjectPattern(node.id, []);
        return allPatternIdentifiers.map((patternIdentifiers) => {
            return {
                identifier: patternIdentifiers.identifier,
                fullPath: [...path, ...patternIdentifiers.path],
                leftHandSidePath: patternIdentifiers.path,
                rightHandSidePath: path
            };
        });
    }

    return [];
}

function extendPath(parentReference, originalPath, identifierPath) {
    const extendedPath = [...parentReference.resolvedPath, ...originalPath, ...identifierPath.slice(1)];
    if (isConstantPath(identifierPath) && identifierPath.length === 1 && identifierPath.at(0)?.endsWith('()')) {
        extendedPath[extendedPath.length - 1] += '()';
    }
    return extendedPath;
}

function aliasReferenceToResolvedReference(sourceCode, parentReference, originalPath, reference) {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier);
    return { node, path, resolvedPath: extendPath(parentReference, originalPath, path) };
}

function isNonInitReference(reference) {
    return reference.init !== true;
}

// eslint-disable-next-line max-statements -- no good idea how to split this function
function resolveAliasReferencesRecursively(sourceCode, reference) {
    const { node } = reference;
    const result = [reference];

    if (isAliasConstAssignment(node)) {
        const declaratedIdentifiers = getDeclaredIdentifiers(sourceCode, node);

        for (const { identifier, leftHandSidePath: identifierPath } of declaratedIdentifiers) {
            const aliasedVariable = findVariable(sourceCode.getScope(node), identifier.name);

            if (aliasedVariable) {
                const aliasReferencesWithoutInit = aliasedVariable.references.filter(isNonInitReference);
                const aliasedResolvedReferences = mapWithArgs(
                    aliasReferencesWithoutInit,
                    aliasReferenceToResolvedReference,
                    sourceCode,
                    reference,
                    identifierPath
                );

                result.push(
                    ...flatMapWithArgs(aliasedResolvedReferences, resolveAliasReferencesRecursively, sourceCode)
                );
            }
        }
    }

    return result;
}

function hasConstantResolvedPath(resolvedReference) {
    return isConstantPath(resolvedReference.resolvedPath);
}

export function resolveAliasedReferences(sourceCode, originalResolvedReferences) {
    return flatMapWithArgs(originalResolvedReferences, resolveAliasReferencesRecursively, sourceCode).filter(
        hasConstantResolvedPath
    );
}
