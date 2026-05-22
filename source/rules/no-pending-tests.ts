import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';

type PendingVisitorContext = {
    readonly node: Rule.Node;
    readonly modifier: string | null;
};

export function isCallbackMissing(node: CallExpression): boolean {
    const [firstArgument] = node.arguments;
    return firstArgument !== undefined && firstArgument.type === 'Literal' && node.arguments.length === 1;
}

export function reportSkipped(context: Readonly<Rule.RuleContext>, node: CallExpression): void {
    const nodeToReport = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;

    context.report({
        node: nodeToReport,
        messageId: 'unexpectedPendingTest'
    });
}

export function checkPendingTestCase(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext
): void {
    if (!isCallExpression(visitorContext.node)) {
        return;
    }

    if (isCallbackMissing(visitorContext.node)) {
        context.report({
            node: visitorContext.node,
            messageId: 'unexpectedPendingTest'
        });
    } else if (visitorContext.modifier === 'pending') {
        reportSkipped(context, visitorContext.node);
    }
}

export function checkPendingSuite(
    context: Readonly<Rule.RuleContext>,
    visitorContext: PendingVisitorContext
): void {
    if (!isCallExpression(visitorContext.node)) {
        return;
    }

    if (visitorContext.modifier === 'pending') {
        reportSkipped(context, visitorContext.node);
    }
}

export const noPendingTestsRule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow pending tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-pending-tests.md'
        },
        messages: {
            unexpectedPendingTest: 'Unexpected pending mocha test.'
        },
        schema: []
    },
    create(context) {
        return createMochaVisitors(context, {
            testCase(visitorContext) {
                checkPendingTestCase(context, visitorContext);
            },

            suite(visitorContext) {
                checkPendingSuite(context, visitorContext);
            }
        });
    }
};
