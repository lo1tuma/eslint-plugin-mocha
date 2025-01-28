import type { Rule, Scope, SourceCode } from 'eslint';
import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.js';
import { isConstantPath,  type DynamicPath } from './member-expression.js';
import type { NameDetails } from '../mocha/name-details.js';

function isLiteralWithValue(node: Rule.Node, expectedValue: string): boolean {
    return node.type === 'Literal' && node.value === expectedValue;
}

function isExclusiveNamedImportBindingWithMatchingSource(variable: Scope.Variable, expectedSource:string): boolean {
    const importDef = variable.defs[0];

    return (
        importDef !== undefined &&
        importDef.type === 'ImportBinding' &&
        importDef.parent.type === 'ImportDeclaration' &&
        isLiteralWithValue(importDef.parent.source as Rule.Node, expectedSource)
    );
}

function getAllNamedImportBindingVariables(moduleScope: Scope.Scope, expectedSource: string): readonly Scope.Variable[] {
    return filterWithArgs(moduleScope.variables, isExclusiveNamedImportBindingWithMatchingSource, expectedSource);
}

function isNonAssignmentReference(reference: Scope.Reference): boolean {
    const node = reference.identifier as Rule.Node;

    return (
        node.parent.type !== 'AssignmentExpression' ||
        node.parent.left !== node
    );
}

function isBindingConstant(variable: Scope.Variable): boolean{
    return variable.references.every(isNonAssignmentReference);
}

function replaceFirstSegment(path: DynamicPath, replacement: string): DynamicPath {
    if (isConstantPath(path)) {
        const [firstSegment, ...remainingPath] = path;
        const suffix = firstSegment?.endsWith('()') ? '()' : '';
        return [`${replacement}${suffix}`, ...remainingPath];
    }
    return path;
}

function resolveImportPathWithOriginalName(reference: Scope.Reference, sourceCode: SourceCode, originalName: string): ResolvedReference {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);

    return {
        node,
        path,
        resolvedPath: replaceFirstSegment(path, originalName)
    };
}

function resolveReferencesForNamedImport(variable: Scope.Variable, sourceCode: SourceCode, identifierNames: readonly string[]): readonly ResolvedReference[] {
    const importDef = variable.defs[0];
    if (importDef !== undefined ) {
        const originalName = importDef.node.imported.name;

        if (identifierNames.includes(originalName)) {
            return mapWithArgs(variable.references, resolveImportPathWithOriginalName, sourceCode, originalName);
        }
    }

    return [];
}

function processNamedImports(sourceCode: SourceCode, moduleScope: Scope.Scope, identifierNames: readonly string[], importSource: string): readonly ResolvedReference[] {
    const namedImportVariables = getAllNamedImportBindingVariables(moduleScope, importSource);
    const constantNamedImports = namedImportVariables.filter(isBindingConstant);

    return flatMapWithArgs(constantNamedImports, resolveReferencesForNamedImport, sourceCode, identifierNames);
}

export function findImportReferencesByName(context: Rule.RuleContext, nameDetailsList: readonly NameDetails[], importSource: string): readonly ResolvedReference[] {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const [maybeModuleScope] = globalScope?.childScopes ?? [];

    if (maybeModuleScope?.type !== 'module') {
        return [];
    }
    const identifierNames = getUniqueBaseNames(nameDetailsList);

    const moduleScope = maybeModuleScope;

    const namedImportReferences = processNamedImports(sourceCode, moduleScope, identifierNames, importSource);
    return namedImportReferences;
}
