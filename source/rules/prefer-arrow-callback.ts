/**
 * @fileoverview A mocha-aware wrapper around ESLint's core `prefer-arrow-callback` rule.
 * @author Toru Nagashima (core eslint rule)
 * @author Michael Fields (mocha-aware rule modifications)
 */
import type { Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isRuleNode } from '../ast/rule-node.js';
import { hasProperty, isRecord } from '../record.js';

const coreRule = builtinRules.get('prefer-arrow-callback');
const docsUrl = 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/prefer-arrow-callback.md';

if (coreRule === undefined) {
    throw new Error('Unable to load the ESLint core "prefer-arrow-callback" rule.');
}

function hasReportNode(
    descriptor: Rule.ReportDescriptor
): descriptor is Rule.ReportDescriptor & { readonly node: Rule.Node; } {
    return isRecord(descriptor) && hasProperty(descriptor, 'node') && isRuleNode(descriptor.node);
}

function shouldSkipReport(
    mochaCallbacks: WeakSet<Rule.Node>,
    descriptor: Rule.ReportDescriptor
): boolean {
    return hasReportNode(descriptor) ? mochaCallbacks.has(descriptor.node) : false;
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
