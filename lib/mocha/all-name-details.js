import { builtinNames } from './descriptors.js';
import { buildAllNameDetailsWithVariants } from './name-details.js';
import { convertNameToPathArray } from './path.js';

function nameConfigToNameDetails(nameConfig) {
    const { name, ...rest } = nameConfig;
    return { path: convertNameToPathArray(name), ...rest };
}

const builtinNameDetailsList = buildAllNameDetailsWithVariants(builtinNames);

export function getAllNames(additionalNames) {
    if (additionalNames.length === 0) {
        return builtinNameDetailsList;
    }

    return [
        ...builtinNameDetailsList,
        ...buildAllNameDetailsWithVariants(additionalNames.map(nameConfigToNameDetails))
    ];
}
