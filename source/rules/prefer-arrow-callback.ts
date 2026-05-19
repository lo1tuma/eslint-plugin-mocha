/**
 * @fileoverview A mocha-aware wrapper around ESLint's core `prefer-arrow-callback` rule.
 * @author Toru Nagashima (core eslint rule)
 * @author Michael Fields (mocha-aware rule modifications)
 */
import type { Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

const coreRule = builtinRules.get('prefer-arrow-callback');
const docsUrl = 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/prefer-arrow-callback.md';

if (coreRule === undefined) {
    throw new Error('Unable to load the ESLint core "prefer-arrow-callback" rule.');
}

function hasReportNode(
    descriptor: Rule.ReportDescriptor
): descriptor is Rule.ReportDescriptor & { node: Rule.Node; } {
    return 'node' in descriptor;
}

function shouldSkipReport(
    mochaCallbacks: WeakSet<Rule.Node>,
    descriptor: Rule.ReportDescriptor
): boolean {
    return hasReportNode(descriptor) &&
        descriptor.node.type === 'FunctionExpression' &&
        mochaCallbacks.has(descriptor.node);
}

function createCoreContext(
    context: Rule.RuleContext,
    mochaCallbacks: WeakSet<Rule.Node>
): Rule.RuleContext {
    return {
        id: context.id,
        options: context.options,
        settings: context.settings,
        parserPath: context.parserPath,
        languageOptions: context.languageOptions,
        parserOptions: context.parserOptions,
        cwd: context.cwd,
        filename: context.filename,
        physicalFilename: context.physicalFilename,
        sourceCode: context.sourceCode,
        getAncestors(): ReturnType<Rule.RuleContext['getAncestors']> {
            return context.getAncestors();
        },
        getDeclaredVariables(
            node: Parameters<Rule.RuleContext['getDeclaredVariables']>[0]
        ): ReturnType<Rule.RuleContext['getDeclaredVariables']> {
            return context.getDeclaredVariables(node);
        },
        getFilename(): ReturnType<Rule.RuleContext['getFilename']> {
            return context.getFilename();
        },
        getPhysicalFilename(): ReturnType<Rule.RuleContext['getPhysicalFilename']> {
            return context.getPhysicalFilename();
        },
        getCwd(): ReturnType<Rule.RuleContext['getCwd']> {
            return context.getCwd();
        },
        getScope(): ReturnType<Rule.RuleContext['getScope']> {
            return context.getScope();
        },
        getSourceCode(): ReturnType<Rule.RuleContext['getSourceCode']> {
            return context.getSourceCode();
        },
        markVariableAsUsed(name: string): ReturnType<Rule.RuleContext['markVariableAsUsed']> {
            return context.markVariableAsUsed(name);
        },
        report(descriptor: Rule.ReportDescriptor): void {
            if (!shouldSkipReport(mochaCallbacks, descriptor)) {
                context.report(descriptor);
            }
        }
    };
}

export const preferArrowCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: coreRule.meta?.type ?? 'suggestion',
        docs: {
            description: coreRule.meta?.docs?.description ?? 'Require using arrow functions for callbacks',
            recommended: false,
            url: docsUrl
        },
        defaultOptions: coreRule.meta?.defaultOptions ?? [],
        schema: coreRule.meta?.schema ?? [],
        fixable: coreRule.meta?.fixable,
        hasSuggestions: coreRule.meta?.hasSuggestions,
        messages: coreRule.meta?.messages ?? {
            preferArrowCallback: 'Unexpected function expression.'
        }
    },

    create(context) {
        const mochaCallbacks = new WeakSet<Rule.Node>();
        const coreListeners = coreRule.create(createCoreContext(context, mochaCallbacks));

        return createMochaVisitors(context, {
            mochaFunctionExpression(node) {
                mochaCallbacks.add(node);
            },
            ...coreListeners
        });
    }
};
