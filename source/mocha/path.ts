import type { DynamicPath } from '../ast/member-expression.js';
import type { NameDetails } from './name-details.js';

export function convertNameToPathArray(name: string): readonly string[] {
    return name.split('.');
}

function isPathPrefixOf(fullPath: DynamicPath, pathToMatch: DynamicPath): boolean {
    return pathToMatch.every((segment, index) => {
        return segment === fullPath[index];
    });
}

export function isSamePath(pathA: DynamicPath, pathB: DynamicPath): boolean {
    return isPathPrefixOf(pathA, pathB) && pathA.length === pathB.length;
}

export function getUniqueBaseNames(nameDetailsList: readonly NameDetails[]): readonly string[] {
    const baseNames = new Set<string>();

    for (const nameDetails of nameDetailsList) {
        const [baseName] = nameDetails.path;
        if (baseName !== undefined) {
            baseNames.add(baseName);
        }
    }

    return Array.from(baseNames);
}
