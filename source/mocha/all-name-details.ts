import {
    builtinNames,
    type CustomMochaEntityType,
    type MochaInterface,
    type NameDetailsConfig
} from './descriptors.js';
import { buildAllNameDetailsWithVariants, type NameDetails } from './name-details.js';
import { convertNameToPathArray } from './path.js';

export type CustomNameConfig = Pick<NameDetailsConfig, 'interface'> & {
    name: string;
    type: CustomMochaEntityType;
};

function nameConfigToNameDetails(nameConfig: Readonly<CustomNameConfig>): Readonly<NameDetailsConfig> {
    const { name, ...rest } = nameConfig;
    return { path: convertNameToPathArray(name), modifier: null, config: null, ...rest };
}

const builtinNameDetailsList = buildAllNameDetailsWithVariants(builtinNames);

function hasMatchingInterface(
    nameDetails: Readonly<NameDetailsConfig>,
    interfaceToUse: MochaInterface
): boolean {
    return interfaceToUse === 'exports' || nameDetails.interface === interfaceToUse;
}

function filterByInterface(
    nameDetailsList: readonly NameDetailsConfig[],
    interfaceToUse: MochaInterface
): readonly NameDetailsConfig[] {
    return nameDetailsList.filter((nameDetails) => {
        return hasMatchingInterface(nameDetails, interfaceToUse);
    });
}

function buildNameDetailsForInterface(
    nameDetailsList: readonly NameDetailsConfig[],
    interfaceToUse: MochaInterface
): readonly NameDetails[] {
    return buildAllNameDetailsWithVariants(filterByInterface(nameDetailsList, interfaceToUse));
}

function getBuiltinNameDetailsForInterface(interfaceToUse: MochaInterface): readonly NameDetails[] {
    return interfaceToUse === 'exports'
        ? builtinNameDetailsList
        : buildNameDetailsForInterface(builtinNames, interfaceToUse);
}

function buildAdditionalNameDetails(additionalNames: readonly CustomNameConfig[]): readonly NameDetails[] {
    const additionalNameDetails = additionalNames.map(nameConfigToNameDetails);

    return buildAllNameDetailsWithVariants(additionalNameDetails);
}

function buildAdditionalNameDetailsForInterface(
    additionalNames: readonly CustomNameConfig[],
    interfaceToUse: MochaInterface
): readonly NameDetails[] {
    return interfaceToUse === 'exports'
        ? buildAdditionalNameDetails(additionalNames)
        : buildNameDetailsForInterface(additionalNames.map(nameConfigToNameDetails), interfaceToUse);
}

export function getAllNames(
    additionalNames: readonly CustomNameConfig[],
    interfaceToUse: MochaInterface,
    includeAllInterfaces = false
): readonly NameDetails[] {
    const builtinNameDetails = includeAllInterfaces
        ? builtinNameDetailsList
        : getBuiltinNameDetailsForInterface(interfaceToUse);

    if (additionalNames.length === 0) {
        return builtinNameDetails;
    }

    return [
        ...builtinNameDetails,
        ...(includeAllInterfaces
            ? buildAdditionalNameDetails(additionalNames)
            : buildAdditionalNameDetailsForInterface(additionalNames, interfaceToUse))
    ];
}
