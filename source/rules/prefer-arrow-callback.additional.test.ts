import assert from 'node:assert';
import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import { suite, test } from 'mocha';
import { hasProperty, isRecord } from '../record.js';

const builtinRuleName = 'prefer-arrow-callback';
const originalGet = builtinRules.get.bind(builtinRules);

type PreferArrowCallbackModule = {
    readonly preferArrowCallbackRule: Readonly<Rule.RuleModule>;
};
type RuleContextFixture = {
    readonly reportedMessages: readonly string[];
    readonly ruleContext: Rule.RuleContext;
};
type ObservedContextRuleFixture = {
    readonly observedContextValues: ReadonlyMap<string, string>;
    readonly rule: Rule.RuleModule;
};

const expectedDefaultMetadata = {
    type: 'suggestion',
    languages: [ 'js/js' ],
    docs: {
        description: 'Require using arrow functions for callbacks',
        recommended: false,
        url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/prefer-arrow-callback.md'
    },
    defaultOptions: [ {
        allowNamedFunctions: false,
        allowUnboundThis: true
    } ],
    schema: [],
    fixable: undefined,
    hasSuggestions: undefined,
    messages: {
        preferArrowCallback: 'Unexpected function expression.'
    }
};

function isPreferArrowCallbackModule(value: unknown): value is PreferArrowCallbackModule {
    return isRecord(value) && hasProperty(value, 'preferArrowCallbackRule');
}

async function importPreferArrowCallbackRule(uniqueKey: string): Promise<PreferArrowCallbackModule> {
    const importedModule: unknown = await import(`./prefer-arrow-callback.js?${uniqueKey}=${Date.now()}`);

    assert.ok(isPreferArrowCallbackModule(importedModule));

    return importedModule;
}

async function withStubbedBuiltinRule(
    rule: Readonly<Rule.RuleModule> | undefined,
    runTest: () => Promise<void>
): Promise<void> {
    try {
        builtinRules.get = function (name) {
            return name === builtinRuleName ? rule : originalGet(name);
        };

        await runTest();
    } finally {
        builtinRules.get = originalGet;
    }
}

function createStubMetadata(): Rule.RuleMetaData {
    return {
        type: 'problem',
        docs: {
            description: 'stub rule'
        },
        defaultOptions: [],
        schema: [],
        messages: {
            preferArrowCallback: 'stub message'
        }
    };
}

function createSourceCode(text: string): Rule.RuleContext['sourceCode'] {
    const linter = new Linter({ configType: 'flat' });

    linter.verify(text, [ {
        languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
        rules: {}
    } ]);

    return linter.getSourceCode();
}

function hasMessage(
    descriptor: Rule.ReportDescriptor
): descriptor is Rule.ReportDescriptor & { readonly message: string; } {
    return isRecord(descriptor) && hasProperty(descriptor, 'message') && typeof descriptor.message === 'string';
}

function createRuleContextFixture(text: string): RuleContextFixture {
    const reportedMessages: string[] = [];
    const ruleContext: Rule.RuleContext = {
        id: 'prefer-arrow-callback',
        options: [],
        settings: {},
        languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
        cwd: process.cwd(),
        filename: '<text>',
        physicalFilename: '<text>',
        sourceCode: createSourceCode(text),
        report(descriptor) {
            if (hasMessage(descriptor)) {
                reportedMessages.push(descriptor.message);
            }
        }
    };

    return { reportedMessages, ruleContext };
}

function createObservedContextRuleFixture(): ObservedContextRuleFixture {
    const observedContextValues = new Map<string, string>();
    const rule: Rule.RuleModule = {
        meta: {
            ...createStubMetadata(),
            fixable: 'code',
            hasSuggestions: true
        },
        create(ruleContext: Rule.RuleContext) {
            const [ node ] = ruleContext.sourceCode.ast.body as [Rule.Node?];
            const reportNode = node ?? ruleContext.sourceCode.ast;

            observedContextValues.set('filename', ruleContext.filename);
            observedContextValues.set('physicalFilename', ruleContext.physicalFilename);
            observedContextValues.set('sourceText', ruleContext.sourceCode.text);
            ruleContext.report({
                node: reportNode,
                message: 'wrapped report'
            });

            return {};
        }
    };

    return { observedContextValues, rule };
}

function createNodeLessReportingRule(): Rule.RuleModule {
    return {
        meta: createStubMetadata(),
        create(ruleContext: Rule.RuleContext) {
            ruleContext.report({
                loc: {
                    column: 0,
                    line: 1
                },
                message: 'wrapped report without node'
            });

            return {};
        }
    };
}

suite('prefer-arrow-callback rule wrapper', function () {
    test('throws when the ESLint core prefer-arrow-callback rule cannot be loaded', async function () {
        await withStubbedBuiltinRule(undefined, async function () {
            await assert.rejects(
                async function importMissingCoreRule() {
                    await importPreferArrowCallbackRule('missing-core-rule');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'Unable to load the ESLint core "prefer-arrow-callback" rule.';
                }
            );
        });
    });

    test('falls back to default metadata when the core rule metadata is incomplete', async function () {
        await withStubbedBuiltinRule({
            meta: {},
            create() {
                return {};
            }
        }, async function () {
            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('fallback-metadata');

            assert.deepStrictEqual(preferArrowCallbackRule.meta, expectedDefaultMetadata);
        });
    });

    test('falls back to default metadata when the core rule metadata is missing', async function () {
        await withStubbedBuiltinRule({
            create() {
                return {};
            }
        }, async function () {
            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('missing-metadata');

            assert.deepStrictEqual(preferArrowCallbackRule.meta, expectedDefaultMetadata);
        });
    });

    test('forwards the wrapped core rule report through the filtered context', async function () {
        const { observedContextValues, rule } = createObservedContextRuleFixture();
        const { reportedMessages, ruleContext } = createRuleContextFixture('foo();');

        await withStubbedBuiltinRule(rule, async function () {
            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('forwarded-context');

            preferArrowCallbackRule.create(ruleContext);
        });

        assert.deepStrictEqual(Object.fromEntries(observedContextValues), {
            filename: '<text>',
            physicalFilename: '<text>',
            sourceText: 'foo();'
        });
        assert.deepStrictEqual(reportedMessages, [ 'wrapped report' ]);
    });

    test('forwards wrapped core rule reports without nodes', async function () {
        const { reportedMessages, ruleContext } = createRuleContextFixture('foo();');

        await withStubbedBuiltinRule(createNodeLessReportingRule(), async function () {
            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('report-without-node');

            preferArrowCallbackRule.create(ruleContext);
        });

        assert.deepStrictEqual(reportedMessages, [ 'wrapped report without node' ]);
    });
});
