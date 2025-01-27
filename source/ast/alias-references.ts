import { findVariable } from '@eslint-community/eslint-utils';
import { flatMapWithArgs, mapWithArgs } from '../list.js';
import { extractMemberExpressionPath, isConstantPath, getIdentifierName, type DynamicPath } from './member-expression.js';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.js';
import type { Rule, SourceCode, Scope } from 'eslint';
import {type VariableDeclarator, isVariableDeclarator, type ObjectPattern, isObjectPattern, isIdentifierPattern, isAssignmentProperty, type IdentifierPattern} from './node-types.js';

function isAliasConstAssignment(node: Rule.Node): node is VariableDeclarator {
    if (isVariableDeclarator(node) && node.parent.type === 'VariableDeclaration') {
        return node.parent.kind === 'const';
    }
    return false;
}

type IdentifierWithPath = { identifier: IdentifierPattern, path: DynamicPath }

function extractIdentifiersFromObjectPattern(node: ObjectPattern, currentPath: DynamicPath): IdentifierWithPath[] {
    return node.properties.flatMap((property): IdentifierWithPath[] => {
        if (!isAssignmentProperty(property)) {
            return [];
        }
        if (property.value.type === 'Identifier') {
            return [{ identifier: property.value, path: [...currentPath, getIdentifierName(property.key)] }];
        }
        if (property.value.type === 'ObjectPattern') {
            return extractIdentifiersFromObjectPattern(property.value, [...currentPath, getIdentifierName(property.key)]);
        }

        return [];
    });
}

type IdentifierWithAssignmentPaths = { identifier: IdentifierPattern, fullPath: DynamicPath, leftHandSidePath: DynamicPath, rightHandSidePath: DynamicPath }

function getDeclaredIdentifiers(sourceCode: SourceCode, node: VariableDeclarator): IdentifierWithAssignmentPaths[] {
    const path = extractMemberExpressionPath(sourceCode, node.init as Rule.Node);

    if (isIdentifierPattern(node.id)) {
        return [{ identifier: node.id, fullPath: path, leftHandSidePath: [], rightHandSidePath: path }];
    }

    if (isObjectPattern(node.id)) {
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

function extendPath(parentReference: ResolvedReference, originalPath: DynamicPath, identifierPath: DynamicPath): DynamicPath {
    const extendedPath = [...parentReference.resolvedPath, ...originalPath, ...identifierPath.slice(1)];
    if (isConstantPath(identifierPath) && identifierPath.length === 1 && identifierPath.at(0)?.endsWith('()')) {
        extendedPath[extendedPath.length - 1] += '()';
    }
    return extendedPath;
}

function aliasReferenceToResolvedReference(reference: Scope.Reference, sourceCode: SourceCode, parentReference: ResolvedReference, originalPath: DynamicPath): ResolvedReference {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node, path, resolvedPath: extendPath(parentReference, originalPath, path) };
}

function isNonInitReference(reference: Scope.Reference): boolean {
    return reference.init !== true;
}

// eslint-disable-next-line max-statements -- no good idea how to split this function
function resolveAliasReferencesRecursively(reference: ResolvedReference, sourceCode: SourceCode): readonly ResolvedReference[] {
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

function hasConstantResolvedPath(resolvedReference: ResolvedReference): boolean {
    return isConstantPath(resolvedReference.resolvedPath);
}

export function resolveAliasedReferences(sourceCode: SourceCode, originalResolvedReferences: readonly ResolvedReference[]) {
    return flatMapWithArgs(originalResolvedReferences, resolveAliasReferencesRecursively, sourceCode).filter(
        hasConstantResolvedPath
    );
}
