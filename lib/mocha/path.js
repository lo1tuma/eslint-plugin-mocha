export function convertNameToPathArray(name) {
    return name.split('.');
}

function isPathPrefixOf(fullPath, pathToMatch) {
    return pathToMatch.every((segment, index) => {
        return segment === fullPath[index];
    });
}

export function isSamePath(pathA, pathB) {
    return isPathPrefixOf(pathA, pathB) && pathA.length === pathB.length;
}

export function getUniqueBaseNames(names) {
    const baseNames = new Set();

    for (const nameDetails of names) {
        const [baseName] = nameDetails.path;
        baseNames.add(baseName);
    }

    return Array.from(baseNames);
}
