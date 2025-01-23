import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { findParentNodeAndPathForIdentifier } from './resolved-reference.js';

function isLiteralWithValue(node, expectedValue) {
    return node.type === 'Literal' && node.value === expectedValue;
}

function isExclusiveNamedImportBindingWithMatchingSource(expectedSource, variable) {
    const importDef = variable.defs[0];

    return (
        variable.defs.length === 1 &&
        importDef.type === 'ImportBinding' &&
        importDef.parent.type === 'ImportDeclaration' &&
        isLiteralWithValue(importDef.parent.source, expectedSource)
    );
}

function getAllNamedImportBindingVariables(moduleScope, expectedSource) {
    return filterWithArgs(moduleScope.variables, isExclusiveNamedImportBindingWithMatchingSource, expectedSource);
}

function isNonAssignmentReference(reference) {
    const node = reference.identifier;

    return (
        node.parent.type !== 'AssignmentExpression' ||
        node.parent.left !== node
    );
}

function isBindingConstant(variable) {
    return variable.references.every(isNonAssignmentReference);
}

function replaceFirstSegment(path, replacement) {
    const [firstSegment, ...remainingPath] = path;
    const suffix = firstSegment.endsWith('()') ? '()' : '';
    return [`${replacement}${suffix}`, ...remainingPath];
}

function resolveImportPathWithOriginalName(sourceCode, originalName, reference) {
    const { node, path } = findParentNodeAndPathForIdentifier(sourceCode, reference.identifier);

    return {
        node,
        path,
        resolvedPath: replaceFirstSegment(path, originalName)
    };
}

function resolveReferencesForNamedImport(sourceCode, identifierNames, variable) {
    const importDef = variable.defs[0];
    const originalName = importDef.node.imported.name;

    if (identifierNames.includes(originalName)) {
        return mapWithArgs(variable.references, resolveImportPathWithOriginalName, sourceCode, originalName);
    }

    return [];
}

function processNamedImports(sourceCode, moduleScope, identifierNames, importSource) {
    const namedImportVariables = getAllNamedImportBindingVariables(moduleScope, importSource);
    const constantNamedImports = namedImportVariables.filter(isBindingConstant);

    return flatMapWithArgs(constantNamedImports, resolveReferencesForNamedImport, sourceCode, identifierNames);
}

export function findImportReferencesByName(context, nameDetailsList, importSource) {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const [maybeModuleScope] = globalScope.childScopes;

    if (maybeModuleScope?.type !== 'module') {
        return [];
    }
    const identifierNames = getUniqueBaseNames(nameDetailsList);

    const moduleScope = maybeModuleScope;

    const namedImportReferences = processNamedImports(sourceCode, moduleScope, identifierNames, importSource);
    return namedImportReferences;
}
