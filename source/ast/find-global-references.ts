import type { Rule, Scope, SourceCode } from 'eslint';
import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { initialReferenceToResolvedReference, type ResolvedReference } from './resolved-reference.js';
import type { NameDetails } from '../mocha/name-details.js';

function matchIdentifierName(reference: Scope.Reference, nameToMatch: string): boolean {
    return reference.identifier.name === nameToMatch;
}

function findGlobalVariableReferences(globalScope: Scope.Scope, name: string): readonly Scope.Reference[] {
    const variable = globalScope.set.get(name);

    if (variable && variable.defs.length === 0) {
        return variable.references;
    }

    return filterWithArgs(globalScope.through, matchIdentifierName, name);
}

function resolveGlobalReferencesByBaseName(baseName: string, globalScope: Scope.Scope, sourceCode: SourceCode): readonly ResolvedReference[] {
    const referencesByName = findGlobalVariableReferences(globalScope, baseName);
    return mapWithArgs(referencesByName, initialReferenceToResolvedReference, sourceCode);
}

export function findGlobalReferencesByName(context: Rule.RuleContext, names: readonly NameDetails[]): readonly ResolvedReference[] {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const baseNames = getUniqueBaseNames(names);

    if (globalScope === null) {
        return [];
    }

    return flatMapWithArgs(baseNames, resolveGlobalReferencesByBaseName, globalScope, sourceCode);
}
