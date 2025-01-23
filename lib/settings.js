import { INTERFACES } from './mocha/descriptors.js';

function settingFor(settings, propertyName, fallback) {
    const value = settings[`mocha/${propertyName}`];
    const mochaSettings = settings.mocha || {};

    return value || mochaSettings[propertyName] || fallback;
}

export function getAdditionalNames(settings) {
    const additionalCustomNames = settingFor(settings, 'additionalCustomNames', []);
    return additionalCustomNames;
}

const validInterfaces = Object.values(INTERFACES);

export function getInterface(settings) {
    const interfaceToUse = settingFor(settings, 'interface', 'BDD');

    if (validInterfaces.includes(interfaceToUse)) {
        return interfaceToUse;
    }

    throw new Error(`Invalid value for mocha/interface "${interfaceToUse}"`);
}
