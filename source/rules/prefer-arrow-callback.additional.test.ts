import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import assert from 'node:assert';
import type * as preferArrowCallbackModule from './prefer-arrow-callback.js';

const builtinRuleName = 'prefer-arrow-callback';
const originalGet = builtinRules.get.bind(builtinRules);

type PreferArrowCallbackModule = typeof preferArrowCallbackModule;

function isPreferArrowCallbackModule(value: unknown): value is PreferArrowCallbackModule {
    return typeof value === 'object' &&
        value !== null &&
        'preferArrowCallbackRule' in value;
}

async function importPreferArrowCallbackRule(uniqueKey: string): Promise<PreferArrowCallbackModule> {
    const importedModule: unknown = await import(`./prefer-arrow-callback.js?${uniqueKey}=${Date.now()}`);

    assert.ok(isPreferArrowCallbackModule(importedModule));

    return importedModule;
}

describe('prefer-arrow-callback rule wrapper', function () {
    it('throws when the ESLint core prefer-arrow-callback rule cannot be loaded', async function () {
        try {
            builtinRules.get = function (name) {
                return name === builtinRuleName ? undefined : originalGet(name);
            };

            await assert.rejects(
                async function () {
                    await importPreferArrowCallbackRule('missing-core-rule');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === 'Unable to load the ESLint core "prefer-arrow-callback" rule.';
                }
            );
        } finally {
            builtinRules.get = originalGet;
        }
    });

    it('falls back to default metadata when the core rule metadata is incomplete', async function () {
        try {
            builtinRules.get = function (name) {
                if (name === builtinRuleName) {
                    return {
                        meta: {},
                        create() {
                            return {};
                        }
                    };
                }

                return originalGet(name);
            };

            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('fallback-metadata');

            assert.deepStrictEqual(preferArrowCallbackRule.meta, {
                type: 'suggestion',
                docs: {
                    description: 'Require using arrow functions for callbacks',
                    recommended: false,
                    url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/prefer-arrow-callback.md'
                },
                defaultOptions: [],
                schema: [],
                fixable: undefined,
                hasSuggestions: undefined,
                messages: {
                    preferArrowCallback: 'Unexpected function expression.'
                }
            });
        } finally {
            builtinRules.get = originalGet;
        }
    });

    it('forwards rule context helper methods to the wrapped core rule', async function () {
        const observedCalls: string[] = [];
        const reportedMessages: string[] = [];

        try {
            builtinRules.get = function (name) {
                if (name === builtinRuleName) {
                    return {
                        meta: {
                            type: 'problem',
                            docs: {
                                description: 'stub rule'
                            },
                            defaultOptions: [],
                            schema: [],
                            fixable: 'code',
                            hasSuggestions: true,
                            messages: {
                                preferArrowCallback: 'stub message'
                            }
                        },
                        create(ruleContext: Rule.RuleContext) {
                            const [node] = ruleContext.sourceCode.ast.body as [Rule.Node?];
                            const reportNode = node ?? ruleContext.sourceCode.ast;

                            observedCalls.push('getAncestors');
                            ruleContext.getAncestors();
                            observedCalls.push('getDeclaredVariables');
                            ruleContext.getDeclaredVariables(reportNode);
                            observedCalls.push('getFilename');
                            ruleContext.getFilename();
                            observedCalls.push('getPhysicalFilename');
                            ruleContext.getPhysicalFilename();
                            observedCalls.push('getCwd');
                            ruleContext.getCwd();
                            observedCalls.push('getScope');
                            ruleContext.getScope();
                            observedCalls.push('getSourceCode');
                            ruleContext.getSourceCode();
                            observedCalls.push('markVariableAsUsed');
                            ruleContext.markVariableAsUsed('foo');
                            observedCalls.push('report');
                            ruleContext.report({
                                node: reportNode,
                                message: 'wrapped report'
                            });

                            return {};
                        }
                    };
                }

                return originalGet(name);
            };

            const { preferArrowCallbackRule } = await importPreferArrowCallbackRule('forwarded-context');
            const linter = new Linter({ configType: 'flat' });
            const text = 'foo();';
            linter.verify(text, [{
                languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
                rules: {}
            }]);
            const sourceCode = linter.getSourceCode();
            const ruleContext: Rule.RuleContext = {
                id: 'prefer-arrow-callback',
                options: [],
                settings: {},
                parserPath: '<text>',
                languageOptions: { ecmaVersion: 2022, sourceType: 'script' },
                parserOptions: {},
                cwd: process.cwd(),
                filename: '<text>',
                physicalFilename: '<text>',
                sourceCode,
                getAncestors() {
                    return [];
                },
                getDeclaredVariables() {
                    return [];
                },
                getFilename() {
                    return '<text>';
                },
                getPhysicalFilename() {
                    return '<text>';
                },
                getCwd() {
                    return process.cwd();
                },
                getScope() {
                    const [scope] = sourceCode.scopeManager.scopes;

                    assert.ok(scope !== undefined);

                    return scope;
                },
                getSourceCode() {
                    return sourceCode;
                },
                markVariableAsUsed() {
                    return false;
                },
                report(descriptor) {
                    if ('message' in descriptor) {
                        reportedMessages.push(descriptor.message);
                    }
                }
            };

            preferArrowCallbackRule.create(ruleContext);
        } finally {
            builtinRules.get = originalGet;
        }

        assert.deepStrictEqual(observedCalls, [
            'getAncestors',
            'getDeclaredVariables',
            'getFilename',
            'getPhysicalFilename',
            'getCwd',
            'getScope',
            'getSourceCode',
            'markVariableAsUsed',
            'report'
        ]);
        assert.deepStrictEqual(reportedMessages, ['wrapped report']);
    });
});
