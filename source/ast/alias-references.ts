import { findVariable } from '@eslint-community/eslint-utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import { flatMapWithArgs, mapWithArgs } from '../list.js';
import {
    type DynamicPath,
    extractMemberExpressionPath,
    getIdentifierName,
    isConstantPath
} from './member-expression.js';
import {
    type IdentifierPattern,
    isAssignmentProperty,
    isIdentifierPattern,
    isObjectPattern,
    isVariableDeclarator,
    type ObjectPattern,
    type VariableDeclarator
} from './node-types.js';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.js';

function isConstVariableDeclarationParent(
    parent: Rule.Node | null
): parent is Extract<Rule.Node, { type: 'VariableDeclaration'; }> {
    return parent?.type === 'VariableDeclaration' && parent.kind === 'const';
}

function isAliasConstAssignment(node: Rule.Node): node is VariableDeclarator {
    return isVariableDeclarator(node) && isConstVariableDeclarationParent(node.parent);
}

type IdentifierWithPath = { identifier: IdentifierPattern; path: DynamicPath; };

function extractIdentifiersFromObjectPattern(
    node: Readonly<ObjectPattern>,
    currentPath: DynamicPath
): readonly IdentifierWithPath[] {
    return node.properties.flatMap((property): readonly IdentifierWithPath[] => {
        if (!isAssignmentProperty(property)) {
            return [];
        }
        if (property.value.type === 'Identifier') {
            return [{ identifier: property.value, path: [...currentPath, getIdentifierName(property.key)] }];
        }
        if (property.value.type === 'ObjectPattern') {
            return extractIdentifiersFromObjectPattern(property.value, [
                ...currentPath,
                getIdentifierName(property.key)
            ]);
        }

        return [];
    });
}

type IdentifierWithAssignmentPaths = {
    identifier: IdentifierPattern;
    leftHandSidePath: DynamicPath;
    rightHandSidePath: DynamicPath;
};

function getDeclaredIdentifiers(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<VariableDeclarator>
): readonly IdentifierWithAssignmentPaths[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typing in eslint core
    const path = extractMemberExpressionPath(sourceCode, node.init as Rule.Node);

    if (isIdentifierPattern(node.id)) {
        return [{ identifier: node.id, leftHandSidePath: [], rightHandSidePath: path }];
    }

    if (isObjectPattern(node.id)) {
        const allPatternIdentifiers = extractIdentifiersFromObjectPattern(node.id, []);
        return allPatternIdentifiers.map((patternIdentifiers) => {
            return {
                identifier: patternIdentifiers.identifier,
                leftHandSidePath: patternIdentifiers.path,
                rightHandSidePath: path
            };
        });
    }

    return [];
}

// eslint-disable-next-line complexity -- no good idea how to refactor
export function extendPath(
    parentReference: Readonly<ResolvedReference>,
    originalPath: DynamicPath,
    identifierPath: DynamicPath
): DynamicPath {
    const extendedPath = [...parentReference.resolvedPath, ...originalPath, ...identifierPath.slice(1)];
    if (
        isConstantPath(identifierPath) && identifierPath.length === 1 && identifierPath.at(0)?.endsWith('()') === true
    ) {
        const lastElement = extendedPath.at(-1);
        if (lastElement !== undefined) {
            extendedPath[extendedPath.length - 1] = typeof lastElement === 'string'
                ? `${lastElement}()`
                : lastElement;
        }
    }
    return extendedPath;
}

function aliasReferenceToResolvedReference(
    reference: Readonly<Scope.Reference>,
    sourceCode: Readonly<SourceCode>,
    parentReference: Readonly<ResolvedReference>,
    originalPath: DynamicPath
): Readonly<ResolvedReference> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad typings in eslint core
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);
    return { node, path, resolvedPath: extendPath(parentReference, originalPath, path) };
}

function isNonInitReference(reference: Readonly<Scope.Reference>): boolean {
    return reference.init !== true;
}

export function getNonInitAliasReferences(
    variable: Readonly<Scope.Variable> | null
): readonly Scope.Reference[] {
    return variable?.references.filter(isNonInitReference) ?? [];
}

function resolveAliasReferencesRecursively(
    reference: Readonly<ResolvedReference>,
    sourceCode: Readonly<SourceCode>
): readonly ResolvedReference[] {
    const { node } = reference;
    const result = [reference];

    if (isAliasConstAssignment(node)) {
        const declaratedIdentifiers = getDeclaredIdentifiers(sourceCode, node);

        for (const { identifier, leftHandSidePath: identifierPath } of declaratedIdentifiers) {
            const aliasedVariable = findVariable(sourceCode.getScope(node), identifier.name);
            const aliasedResolvedReferences = mapWithArgs(
                getNonInitAliasReferences(aliasedVariable),
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

    return result;
}

function hasConstantResolvedPath(resolvedReference: Readonly<ResolvedReference>): boolean {
    return isConstantPath(resolvedReference.resolvedPath);
}

export function resolveAliasedReferences(
    sourceCode: Readonly<SourceCode>,
    originalResolvedReferences: readonly ResolvedReference[]
): readonly ResolvedReference[] {
    return flatMapWithArgs(originalResolvedReferences, resolveAliasReferencesRecursively, sourceCode).filter(
        hasConstantResolvedPath
    );
}
