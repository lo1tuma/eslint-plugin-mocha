import type { Rule, Scope, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import type { NameDetails } from '../mocha/name-details.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { type DynamicPath, isConstantPath } from './member-expression.js';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.js';

function isLiteralWithValue(node: Except<Rule.Node, 'parent'>, expectedValue: string): boolean {
    return node.type === 'Literal' && node.value === expectedValue;
}

function isExclusiveNamedImportBindingWithMatchingSource(
    variable: Readonly<Scope.Variable>,
    expectedSource: string
): boolean {
    const importDef = variable.defs[0];

    return (
        importDef !== undefined &&
        importDef.type === 'ImportBinding' &&
        isLiteralWithValue(importDef.parent.source, expectedSource)
    );
}

function getAllNamedImportBindingVariables(
    moduleScope: Readonly<Scope.Scope>,
    expectedSource: string
): readonly Scope.Variable[] {
    return filterWithArgs(moduleScope.variables, isExclusiveNamedImportBindingWithMatchingSource, expectedSource);
}

function isNonAssignmentReference(reference: Readonly<Scope.Reference>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad eslint core typings
    const node = reference.identifier as Rule.Node;

    return (
        node.parent.type !== 'AssignmentExpression' ||
        node.parent.left !== node
    );
}

function isBindingConstant(variable: Readonly<Scope.Variable>): boolean {
    return variable.references.every(isNonAssignmentReference);
}

function replaceFirstSegment(path: DynamicPath, replacement: string): DynamicPath {
    if (isConstantPath(path)) {
        const [firstSegment, ...remainingPath] = path;
        const suffix = firstSegment?.endsWith('()') === true ? '()' : '';
        return [`${replacement}${suffix}`, ...remainingPath];
    }
    return path;
}

function resolveImportPathWithOriginalName(
    reference: Readonly<Scope.Reference>,
    sourceCode: Readonly<SourceCode>,
    originalName: string
): Readonly<ResolvedReference> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad eslint core typings
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier as Rule.Node);

    return {
        node,
        path,
        resolvedPath: replaceFirstSegment(path, originalName)
    };
}

function resolveReferencesForNamedImport(
    variable: Readonly<Scope.Variable>,
    sourceCode: Readonly<SourceCode>,
    identifierNames: readonly string[]
): readonly ResolvedReference[] {
    const importDef = variable.defs[0];
    if (importDef !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ok
        const originalName = importDef.node.imported.name;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- ok
        if (identifierNames.includes(originalName)) {
            return mapWithArgs(variable.references, resolveImportPathWithOriginalName, sourceCode, originalName);
        }
    }

    return [];
}

function processNamedImports(
    sourceCode: Readonly<SourceCode>,
    moduleScope: Readonly<Scope.Scope>,
    identifierNames: readonly string[],
    importSource: string
): readonly ResolvedReference[] {
    const namedImportVariables = getAllNamedImportBindingVariables(moduleScope, importSource);
    const constantNamedImports = namedImportVariables.filter(isBindingConstant);

    return flatMapWithArgs(constantNamedImports, resolveReferencesForNamedImport, sourceCode, identifierNames);
}

export function findImportReferencesByName(
    context: Readonly<Rule.RuleContext>,
    nameDetailsList: readonly NameDetails[],
    importSource: string
): readonly ResolvedReference[] {
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
