const mochaInterfaces = [
    'BDD',
    'TDD',
    'exports'
] as const;

export type MochaInterface = (typeof mochaInterfaces)[number];

export function isMochaInterface(value: unknown): value is MochaInterface {
    return (mochaInterfaces as readonly unknown[]).includes(value);
}

export const configCallNames = ['timeout', 'slow', 'retries'] as const;

export type MochaConfigCall = (typeof configCallNames)[number];

export type MochaEntityType = 'config' | 'hook' | 'suite' | 'testCase';

export type MochaModifier = 'exclusive' | 'pending';

export type NameDetailsConfig = {
    path: readonly string[];
    interface: MochaInterface;
    type: MochaEntityType;
    modifier: MochaModifier | null;
    config: MochaConfigCall | null;
};

export const MODIFIERS = {
    pending: 'pending',
    exclusive: 'exclusive'
};

export const builtinNames: readonly NameDetailsConfig[] = [
    { path: ['describe'], interface: 'BDD', type: 'suite', modifier: null, config: null },
    { path: ['context'], interface: 'BDD', type: 'suite', modifier: null, config: null },
    { path: ['suite'], interface: 'TDD', type: 'suite', modifier: null, config: null },
    { path: ['it'], interface: 'BDD', type: 'testCase', modifier: null, config: null },
    { path: ['specify'], interface: 'BDD', type: 'testCase', modifier: null, config: null },
    { path: ['test'], interface: 'TDD', type: 'testCase', modifier: null, config: null },
    { path: ['before'], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: ['after'], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: ['beforeEach'], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: ['afterEach'], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: ['suiteSetup'], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: ['suiteTeardown'], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: ['setup'], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: ['teardown'], interface: 'TDD', type: 'hook', modifier: null, config: null }
];
