import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { initialReferenceToResolvedReference } from './resolved-reference.js';

function matchIdentifierName(nameToMatch, reference) {
    return reference.identifier.name === nameToMatch;
}

function findGlobalVariableReferences(globalScope, name) {
    const variable = globalScope.set.get(name);

    if (variable && variable.defs.length === 0) {
        return variable.references;
    }

    return filterWithArgs(globalScope.through, matchIdentifierName, name);
}

function resolveGlobalReferencesByBaseName(globalScope, sourceCode, baseName) {
    const referencesByName = findGlobalVariableReferences(globalScope, baseName);
    return mapWithArgs(referencesByName, initialReferenceToResolvedReference, sourceCode);
}

export function findGlobalReferencesByName(context, names) {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const baseNames = getUniqueBaseNames(names);

    return flatMapWithArgs(baseNames, resolveGlobalReferencesByBaseName, globalScope, sourceCode);
}
