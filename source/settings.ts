import type { CustomNameConfig } from './mocha/all-name-details.js';
import { isMochaInterface, type MochaInterface } from './mocha/descriptors.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

function validateAdditionalNames(value: unknown): asserts value is readonly CustomNameConfig[] {
    if (!Array.isArray(value)) {
        throw new Error('additionalCustomNames must be an array');
    }

    for (const item of value) {
        if (!isRecord(item)) {
            throw new Error('additionalCustomNames item must be an object');
        }
        if (!isMochaInterface(item.interface)) {
            throw new Error(`additionalCustomNames interface ${item.interfave} is invalid`);
        }
        if (typeof item.name !== 'string') {
            throw new Error(`additionalCustomNames name missing or invalid`);
        }
        if (typeof item.type !== 'string') {
            throw new Error(`additionalCustomNames type missing or invalid`);
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
