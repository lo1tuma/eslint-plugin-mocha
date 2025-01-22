import { createMochaVisitors } from '../ast/mochaVisitors.js';

export const noPendingTestsRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow pending tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-pending-tests.md'
        },
        schema: []
    },
    create(context) {
        function isCallbackMissing(node) {
            return node.arguments.length === 1 &&
                node.arguments[0].type === 'Literal';
        }

        function reportSkipped(visitorContext) {
            const nodeToReport = visitorContext.node.callee.type === 'MemberExpression'
                ? visitorContext.node.callee.property
                : visitorContext.node.callee;

            context.report({
                node: nodeToReport,
                message: 'Unexpected pending mocha test.'
            });
        }

        return createMochaVisitors(context, {
            testCase(visitorContext) {
                if (isCallbackMissing(visitorContext.node)) {
                    context.report({
                        node: visitorContext.node,
                        message: 'Unexpected pending mocha test.'
                    });
                } else if (visitorContext.modifier === 'pending') {
                    reportSkipped(visitorContext);
                }
            },

            suite(visitorContext) {
                if (visitorContext.modifier === 'pending') {
                    reportSkipped(visitorContext);
                }
            }
        });
    }
};
