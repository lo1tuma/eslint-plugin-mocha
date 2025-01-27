import { builtinNames, type NameDetailsConfig } from './descriptors.js';
import { buildAllNameDetailsWithVariants, type NameDetails } from './name-details.js';
import { convertNameToPathArray } from './path.js';

export type CustomNameConfig = Pick<NameDetailsConfig, 'interface' | 'type'> & { name: string; };

function nameConfigToNameDetails(nameConfig: Readonly<CustomNameConfig>): Readonly<NameDetailsConfig> {
    const { name, ...rest } = nameConfig;
    return { path: convertNameToPathArray(name), modifier: null, config: null, ...rest };
}

const builtinNameDetailsList = buildAllNameDetailsWithVariants(builtinNames);

export function getAllNames(additionalNames: readonly CustomNameConfig[]): readonly NameDetails[] {
    if (additionalNames.length === 0) {
        return builtinNameDetailsList;
    }

    return [
        ...builtinNameDetailsList,
        ...buildAllNameDetailsWithVariants(additionalNames.map(nameConfigToNameDetails))
    ];
}
