import type { RuleTester } from 'eslint';
import type { MochaInterface } from './mocha/descriptors.js';
import { isRecord } from './record.js';

type RuleTestCase = RuleTester.InvalidTestCase | RuleTester.ValidTestCase;

function mergeMochaInterfaceIntoSettings(
    settings: Readonly<Record<string, unknown>> | undefined,
    interfaceToUse: MochaInterface
): Record<string, unknown> {
    const mochaSettings = isRecord(settings?.mocha)
        ? settings.mocha
        : {};

    return {
        ...settings,
        'mocha/interface': interfaceToUse,
        mocha: {
            ...mochaSettings,
            interface: interfaceToUse
        }
    };
}

export function withInterface(interfaceToUse: MochaInterface, testCase: string): RuleTester.ValidTestCase;
export function withInterface<T extends RuleTestCase>(interfaceToUse: MochaInterface, testCase: T): T;
export function withInterface(
    interfaceToUse: MochaInterface,
    testCase: Readonly<RuleTestCase> | string
): RuleTestCase {
    const normalizedTestCase = typeof testCase === 'string'
        ? { code: testCase }
        : testCase;
    const testCaseWithInterface: typeof normalizedTestCase = {
        ...normalizedTestCase,
        settings: mergeMochaInterfaceIntoSettings(normalizedTestCase.settings, interfaceToUse)
    };

    return testCaseWithInterface;
}
