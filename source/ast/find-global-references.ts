import type { Rule, Scope, SourceCode } from 'eslint';
import { filterWithArgs, flatMapWithArgs, mapWithArgs } from '../list.js';
import type { NameDetails } from '../mocha/name-details.js';
import { getUniqueBaseNames } from '../mocha/path.js';
import { initialReferenceToResolvedReference, type ResolvedReference } from './resolved-reference.js';

function matchIdentifierName(reference: Readonly<Scope.Reference>, nameToMatch: string): boolean {
    return reference.identifier.name === nameToMatch;
}

function findGlobalVariableReferences(globalScope: Readonly<Scope.Scope>, name: string): readonly Scope.Reference[] {
    const variable = globalScope.set.get(name);

    if (variable !== undefined && variable.defs.length === 0) {
        return variable.references;
    }

    return filterWithArgs(globalScope.through, matchIdentifierName, name);
}

function resolveGlobalReferencesByBaseName(
    baseName: string,
    globalScope: Readonly<Scope.Scope>,
    sourceCode: Readonly<SourceCode>
): readonly ResolvedReference[] {
    const referencesByName = findGlobalVariableReferences(globalScope, baseName);
    return mapWithArgs(referencesByName, initialReferenceToResolvedReference, sourceCode);
}

export function findGlobalReferencesByName(
    context: Readonly<Rule.RuleContext>,
    names: readonly NameDetails[]
): readonly ResolvedReference[] {
    const { sourceCode } = context;
    const { globalScope } = sourceCode.scopeManager;
    const baseNames = getUniqueBaseNames(names);

    if (globalScope === null) {
        return [];
    }

    return flatMapWithArgs(baseNames, resolveGlobalReferencesByBaseName, globalScope, sourceCode);
}
