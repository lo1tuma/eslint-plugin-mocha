import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression } from '../ast/node-types.js';

export const noPendingTestsRule: Rule.RuleModule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow pending tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-pending-tests.md'
        },
        schema: []
    },
    create(context) {
        function isCallbackMissing(node: CallExpression): boolean {
            const [firstArgument] = node.arguments;
            return firstArgument !== undefined && firstArgument.type === 'Literal' && node.arguments.length === 1;
        }

        function reportSkipped(node: CallExpression): void {
            const nodeToReport = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;

            context.report({
                node: nodeToReport,
                message: 'Unexpected pending mocha test.'
            });
        }

        return createMochaVisitors(context, {
            testCase(visitorContext) {
                if (!isCallExpression(visitorContext.node)) {
                    return;
                }

                if (isCallbackMissing(visitorContext.node)) {
                    context.report({
                        node: visitorContext.node,
                        message: 'Unexpected pending mocha test.'
                    });
                } else if (visitorContext.modifier === 'pending') {
                    reportSkipped(visitorContext.node);
                }
            },

            suite(visitorContext) {
                if (!isCallExpression(visitorContext.node)) {
                    return;
                }

                if (visitorContext.modifier === 'pending') {
                    reportSkipped(visitorContext.node);
                }
            }
        });
    }
};
