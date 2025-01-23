export const INTERFACES = {
    BDD: 'BDD',
    TDD: 'TDD',
    EXPORTS: 'exports'
};

export const TYPES = {
    suite: 'suite',
    testCase: 'testCase',
    hook: 'hook',
    config: 'config'
};

export const MODIFIERS = {
    pending: 'pending',
    exclusive: 'exclusive'
};

export const builtinNames = [
    { path: ['describe'], interface: INTERFACES.BDD, type: TYPES.suite, modifier: null, config: null },
    { path: ['context'], interface: INTERFACES.BDD, type: TYPES.suite, modifier: null, config: null },
    { path: ['suite'], interface: INTERFACES.TDD, type: TYPES.suite, modifier: null, config: null },
    { path: ['it'], interface: INTERFACES.BDD, type: TYPES.testCase, modifier: null, config: null },
    { path: ['specify'], interface: INTERFACES.BDD, type: TYPES.testCase, modifier: null, config: null },
    { path: ['test'], interface: INTERFACES.TDD, type: TYPES.testCase, modifier: null, config: null },
    { path: ['before'], interface: INTERFACES.BDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['after'], interface: INTERFACES.BDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['beforeEach'], interface: INTERFACES.BDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['afterEach'], interface: INTERFACES.BDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['suiteSetup'], interface: INTERFACES.TDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['suiteTeardown'], interface: INTERFACES.TDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['setup'], interface: INTERFACES.TDD, type: TYPES.hook, modifier: null, config: null },
    { path: ['teardown'], interface: INTERFACES.TDD, type: TYPES.hook, modifier: null, config: null }
];

export const configCallNames = ['timeout', 'slow', 'retries'];
