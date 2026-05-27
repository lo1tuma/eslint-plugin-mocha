import type { Rule, Scope, SourceCode } from 'eslint';
import type { Except } from 'type-fest';
import { flatMapWithArgs, mapWithArgs } from '../list.js';
import type { NameDetails } from '../mocha/name-details.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { isRecord } from '../record.js';
import { type DynamicPath, isConstantPath } from './member-expression.js';
import { getParentNode } from './node-types.js';
import { findParentNodeAndPathForIdentifier, type ResolvedReference } from './resolved-reference.js';

function isLiteralWithValue(node: Except<Rule.Node, 'parent'>, expectedValue: string | null): boolean {
    return node.type === 'Literal' && (expectedValue === null || node.value === expectedValue);
}

type ImportSpecifierNode = {
    readonly type: 'ImportSpecifier';
    readonly imported: {
        readonly name: string;
    };
};

type ImportBindingDefinition = Readonly<Scope.Definition> & {
    readonly type: 'ImportBinding';
    readonly node: Readonly<ImportSpecifierNode>;
};

type NamedImportBindingVariable = Readonly<Scope.Variable> & {
    readonly defs: readonly [ImportBindingDefinition, ...(readonly Scope.Definition[])];
};

export function isImportSpecifierNode(node: unknown): node is Readonly<ImportSpecifierNode> {
    return isRecord(node) &&
        node.type === 'ImportSpecifier' &&
        isRecord(node.imported) &&
        typeof node.imported.name === 'string';
}

export function isExclusiveNamedImportBindingWithMatchingSource(
    variable: Readonly<Scope.Variable>,
    expectedSource: string | null
): variable is NamedImportBindingVariable {
    const importDef = variable.defs[0];
    const importNode: unknown = importDef?.node;

    return (
        importDef !== undefined &&
        importDef.type === 'ImportBinding' &&
        isImportSpecifierNode(importNode) &&
        isLiteralWithValue(importDef.parent.source, expectedSource)
    );
}

function getAllNamedImportBindingVariables(
    moduleScope: Readonly<Scope.Scope>,
    expectedSource: string | null
): readonly NamedImportBindingVariable[] {
    return moduleScope.variables.filter((variable): variable is NamedImportBindingVariable => {
        return isExclusiveNamedImportBindingWithMatchingSource(variable, expectedSource);
    });
}

function isNonAssignmentReference(reference: Readonly<Scope.Reference>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad eslint core typings
    const node = reference.identifier as Rule.Node;
    const parent = getParentNode(node);

    return (
        parent.type !== 'AssignmentExpression' ||
        parent.left !== node
    );
}

function isBindingConstant(variable: Readonly<Scope.Variable>): boolean {
    return variable.references.every(isNonAssignmentReference);
}

export function replaceFirstSegment(path: DynamicPath, replacement: string): DynamicPath {
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
    variable: Readonly<NamedImportBindingVariable>,
    sourceCode: Readonly<SourceCode>,
    identifierNames: readonly string[]
): readonly ResolvedReference[] {
    const originalName = variable.defs[0].node.imported.name;
    if (identifierNames.includes(originalName)) {
        return mapWithArgs(variable.references, resolveImportPathWithOriginalName, sourceCode, originalName);
    }

    return [];
}

function processNamedImports(
    sourceCode: Readonly<SourceCode>,
    moduleScope: Readonly<Scope.Scope>,
    identifierNames: readonly string[],
    importSource: string | null
): readonly ResolvedReference[] {
    const namedImportVariables = getAllNamedImportBindingVariables(moduleScope, importSource);
    const constantNamedImports = namedImportVariables.filter(isBindingConstant);

    return flatMapWithArgs(constantNamedImports, resolveReferencesForNamedImport, sourceCode, identifierNames);
}

export function findImportReferencesByName(
    context: Readonly<Rule.RuleContext>,
    nameDetailsList: readonly NameDetails[],
    importSource: string | null
): readonly ResolvedReference[] {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const maybeModuleScope = globalScope?.childScopes?.[0];

    if (maybeModuleScope?.type !== 'module') {
        return [];
    }
    const identifierNames = getUniqueBaseNames(nameDetailsList);

    const moduleScope = maybeModuleScope;

    const namedImportReferences = processNamedImports(sourceCode, moduleScope, identifierNames, importSource);
    return namedImportReferences;
}
