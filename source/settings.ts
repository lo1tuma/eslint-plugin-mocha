import type { CustomNameConfig } from './mocha/all-name-details.js';
import { isMochaInterface, type MochaInterface } from './mocha/descriptors.js';
import { isRecord } from './record.js';

function settingFor(settings: Record<string, unknown>, propertyName: string, fallback: unknown): unknown {
    const value = settings[`mocha/${propertyName}`];

    if (value !== undefined) {
        return value;
    }

    const mochaSettings = isRecord(settings.mocha) ? settings.mocha : {};

    if (mochaSettings[propertyName] !== undefined) {
        return mochaSettings[propertyName];
    }

    return fallback;
}

// eslint-disable-next-line max-statements,complexity -- no good idea how to refactor
function validateAdditionalNames(value: unknown): asserts value is readonly CustomNameConfig[] {
    if (!Array.isArray(value)) {
        throw new TypeError('additionalCustomNames must be an array');
    }

    for (const item of value) {
        if (!isRecord(item)) {
            throw new Error('additionalCustomNames item must be an object');
        }
        if (!isMochaInterface(item.interface)) {
            throw new Error(`additionalCustomNames interface ${item.interface} is invalid`);
        }
        if (typeof item.name !== 'string') {
            throw new TypeError('additionalCustomNames name missing or invalid');
        }
        if (typeof item.type !== 'string') {
            throw new TypeError('additionalCustomNames type missing or invalid');
        }
    }
}

export function getAdditionalNames(settings: Record<string, unknown>): readonly CustomNameConfig[] {
    const additionalCustomNames = settingFor(settings, 'additionalCustomNames', []);
    validateAdditionalNames(additionalCustomNames);
    return additionalCustomNames;
}

export function getInterface(settings: Record<string, unknown>): MochaInterface {
    const interfaceToUse = settingFor(settings, 'interface', 'BDD');

    if (isMochaInterface(interfaceToUse)) {
        return interfaceToUse;
    }

    throw new Error(`Invalid value for mocha/interface "${interfaceToUse}"`);
}
