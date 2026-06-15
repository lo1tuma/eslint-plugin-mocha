const mochaInterfaces = [
    'BDD',
    'TDD',
    'require'
] as const;

export type MochaInterface = (typeof mochaInterfaces)[number];

export function isMochaInterface(value: unknown): value is MochaInterface {
    return (mochaInterfaces as readonly unknown[]).includes(value);
}

export const configCallNames = [ 'timeout', 'slow', 'retries' ] as const;

export type MochaConfigCall = (typeof configCallNames)[number];

export type MochaEntityType = 'config' | 'hook' | 'suite' | 'testCase';
const customNameTypes = [ 'hook', 'suite', 'testCase' ] as const;
export type CustomMochaEntityType = (typeof customNameTypes)[number];

export function isCustomMochaEntityType(value: unknown): value is CustomMochaEntityType {
    return (customNameTypes as readonly unknown[]).includes(value);
}

export type MochaModifier = 'exclusive' | 'pending';

export type NameDetailsConfig = {
    readonly path: readonly string[];
    readonly interface: MochaInterface;
    readonly type: MochaEntityType;
    readonly modifier: MochaModifier | null;
    readonly config: MochaConfigCall | null;
};

export const builtinNames: readonly NameDetailsConfig[] = [
    { path: [ 'describe' ], interface: 'BDD', type: 'suite', modifier: null, config: null },
    { path: [ 'context' ], interface: 'BDD', type: 'suite', modifier: null, config: null },
    { path: [ 'suite' ], interface: 'TDD', type: 'suite', modifier: null, config: null },
    { path: [ 'it' ], interface: 'BDD', type: 'testCase', modifier: null, config: null },
    { path: [ 'specify' ], interface: 'BDD', type: 'testCase', modifier: null, config: null },
    { path: [ 'test' ], interface: 'TDD', type: 'testCase', modifier: null, config: null },
    { path: [ 'before' ], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: [ 'after' ], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: [ 'beforeEach' ], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: [ 'afterEach' ], interface: 'BDD', type: 'hook', modifier: null, config: null },
    { path: [ 'suiteSetup' ], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: [ 'suiteTeardown' ], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: [ 'setup' ], interface: 'TDD', type: 'hook', modifier: null, config: null },
    { path: [ 'teardown' ], interface: 'TDD', type: 'hook', modifier: null, config: null }
];
