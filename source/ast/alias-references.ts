import { findVariable } from '@eslint-community/eslint-utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import { flatMapWithArgs, mapWithArgs } from '../list.ts';
import {
    type DynamicPath,
    extractMemberExpressionPath,
    getIdentifierName,
    isConstantPath
} from './member-expression.ts';
import {
    type IdentifierPattern,
    isAssignmentProperty,
    isIdentifierPattern,
    isObjectPattern,
    isVariableDeclarator,
    type ObjectPattern,
    type VariableDeclarator
} from './node-types.ts';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.ts';
import { asRuleNode } from './rule-node.ts';

function isConstVariableDeclarationParent(
    parent: Rule.Node | null
): parent is Extract<Rule.Node, { readonly type: 'VariableDeclaration'; }> {
    return parent?.type === 'VariableDeclaration' && parent.kind === 'const';
}

function isAliasConstAssignment(node: Rule.Node): node is VariableDeclarator {
    return isVariableDeclarator(node) && isConstVariableDeclarationParent(node.parent);
}

type IdentifierWithPath = { readonly identifier: IdentifierPattern; readonly path: DynamicPath; };

function extractIdentifiersFromObjectPattern(
    node: Readonly<ObjectPattern>,
    currentPath: DynamicPath
): readonly IdentifierWithPath[] {
    return node.properties.flatMap(function (property): readonly IdentifierWithPath[] {
        if (!isAssignmentProperty(property)) {
            return [];
        }
        if (property.value.type === 'Identifier') {
            return [ { identifier: property.value, path: [ ...currentPath, getIdentifierName(property.key) ] } ];
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
    readonly identifier: IdentifierPattern;
    readonly leftHandSidePath: DynamicPath;
    readonly rightHandSidePath: DynamicPath;
};

function getDeclaredIdentifiers(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<VariableDeclarator>
): readonly IdentifierWithAssignmentPaths[] {
    const path = extractMemberExpressionPath(sourceCode, asRuleNode(node.init));

    if (isIdentifierPattern(node.id)) {
        return [ { identifier: node.id, leftHandSidePath: [], rightHandSidePath: path } ];
    }

    if (isObjectPattern(node.id)) {
        const allPatternIdentifiers = extractIdentifiersFromObjectPattern(node.id, []);
        return allPatternIdentifiers.map(function (patternIdentifiers) {
            return {
                identifier: patternIdentifiers.identifier,
                leftHandSidePath: patternIdentifiers.path,
                rightHandSidePath: path
            };
        });
    }

    return [];
}

function extendPath(
    parentReference: Readonly<ResolvedReference>,
    originalPath: DynamicPath,
    identifierPath: DynamicPath
): DynamicPath {
    const extendedPath = [ ...parentReference.resolvedPath, ...originalPath, ...identifierPath.slice(1) ];
    const [ callAlias ] = identifierPath;

    if (identifierPath.length === 1 && String(callAlias).endsWith('()')) {
        const lastIndex = extendedPath.length - 1;
        const lastElement = extendedPath[lastIndex];

        if (typeof lastElement === 'string') {
            extendedPath[lastIndex] = `${lastElement}()`;
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
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, asRuleNode(reference.identifier));
    return { node, path, resolvedPath: extendPath(parentReference, originalPath, path) };
}

function isNonInitReference(reference: Readonly<Scope.Reference>): boolean {
    return reference.init !== true;
}

function getNonInitAliasReferences(
    variable: Readonly<Scope.Variable>
): readonly Scope.Reference[] {
    return variable.references.filter(isNonInitReference);
}

function resolveAliasReferencesRecursively(
    reference: Readonly<ResolvedReference>,
    sourceCode: Readonly<SourceCode>
): readonly ResolvedReference[] {
    const { node } = reference;
    const result = [ reference ];

    function resolveAliasedReferencesForIdentifier(
        identifierPath: DynamicPath,
        identifierName: string
    ): readonly ResolvedReference[] {
        const aliasedVariable = findVariable(sourceCode.getScope(reference.node), identifierName);

        if (aliasedVariable === null) {
            return [];
        }

        const aliasedResolvedReferences = mapWithArgs(
            getNonInitAliasReferences(aliasedVariable),
            aliasReferenceToResolvedReference,
            sourceCode,
            reference,
            identifierPath
        );

        return flatMapWithArgs(aliasedResolvedReferences, resolveAliasReferencesRecursively, sourceCode);
    }

    if (isAliasConstAssignment(node)) {
        const declaratedIdentifiers = getDeclaredIdentifiers(sourceCode, node);

        for (const { identifier, leftHandSidePath: identifierPath } of declaratedIdentifiers) {
            result.push(...resolveAliasedReferencesForIdentifier(identifierPath, identifier.name));
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
