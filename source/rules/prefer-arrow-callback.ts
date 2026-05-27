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

export function shouldSkipReport(
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
    return Object.create(context, {
        report: {
            value(descriptor: Rule.ReportDescriptor): void {
                if (!shouldSkipReport(mochaCallbacks, descriptor)) {
                    context.report(descriptor);
                }
            }
        }
    });
}

export const preferArrowCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: coreRule.meta?.type ?? 'suggestion',
        languages: ['js/js'],
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
