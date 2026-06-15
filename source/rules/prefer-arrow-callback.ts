/**
 * @fileoverview A mocha-aware wrapper around ESLint's core `prefer-arrow-callback` rule.
 * @author Toru Nagashima (core eslint rule)
 * @author Michael Fields (mocha-aware rule modifications)
 */
import type { Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { isMochaCallbackReport } from './prefer-arrow-callback-report.ts';

const coreRule = builtinRules.get('prefer-arrow-callback');
const docsUrl = 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/prefer-arrow-callback.md';

if (coreRule === undefined) {
    throw new Error('Unable to load the ESLint core "prefer-arrow-callback" rule.');
}

function createCoreContext(
    context: Rule.RuleContext,
    mochaCallbacks: WeakSet<Rule.Node>
): Rule.RuleContext {
    return {
        cwd: context.cwd,
        filename: context.filename,
        physicalFilename: context.physicalFilename,
        sourceCode: context.sourceCode,
        settings: context.settings,
        languageOptions: context.languageOptions,
        id: context.id,
        options: context.options,
        report(descriptor: Rule.ReportDescriptor): void {
            if (!isMochaCallbackReport(mochaCallbacks, descriptor)) {
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
        fixable: coreRule.meta?.fixable,
        hasSuggestions: coreRule.meta?.hasSuggestions,
        schema: coreRule.meta?.schema ?? [],
        defaultOptions: [ {
            allowNamedFunctions: false,
            allowUnboundThis: true
        } ],
        messages: coreRule.meta?.messages ?? {
            preferArrowCallback: 'Unexpected function expression.'
        },
        languages: [ 'js/js' ]
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
