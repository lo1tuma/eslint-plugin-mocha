import { createMochaVisitors } from '../ast/mochaVisitors.js';
import { isSuiteConfigCall } from '../util/ast.js';

const FUNCTION = 1;
const DESCRIBE = 2;
const PURE = 3;

function isNestedInDescribeBlock(nesting) {
    return (
        nesting.length > 0 &&
        !nesting.includes(PURE) &&
        nesting.lastIndexOf(FUNCTION) < nesting.lastIndexOf(DESCRIBE)
    );
}

function reportCallExpression(context, callExpression) {
    const message = 'Unexpected function call in describe block.';

    context.report({
        message,
        node: callExpression.callee
    });
}

function reportMemberExpression(context, memberExpression) {
    const message = 'Unexpected member expression in describe block. ' +
        'Member expressions may call functions via getters.';

    context.report({
        message,
        node: memberExpression
    });
}

export const noSetupInDescribeRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow setup in describe blocks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-setup-in-describe.md'
        },
        schema: []
    },
    create(context) {
        const nesting = [];
        const suiteNodes = new WeakSet();

        function handleCallExpressionInDescribe(node) {
            if (isSuiteConfigCall(node)) {
                nesting.push(PURE);
            } else if (isNestedInDescribeBlock(nesting)) {
                reportCallExpression(context, node);
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                nesting.push(DESCRIBE);
                suiteNodes.add(visitorContext.node);
            },

            'suite:exit'() {
                nesting.pop();
            },

            nonMochaCallExpression(node) {
                if (nesting.length === 0) {
                    return;
                }
                handleCallExpressionInDescribe(node);
            },

            nonMochaMemberExpression(node) {
                if (
                    !suiteNodes.has(node.parent) &&
                    isNestedInDescribeBlock(nesting)
                ) {
                    reportMemberExpression(context, node);
                }
            },

            FunctionDeclaration() {
                if (nesting.length > 0) {
                    nesting.push(FUNCTION);
                }
            },
            'FunctionDeclaration:exit'() {
                if (nesting.length > 0) {
                    nesting.pop();
                }
            },

            FunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.push(FUNCTION);
                }
            },
            'FunctionExpression:exit'(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.pop();
                }
            },

            ArrowFunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.push(FUNCTION);
                }
            },
            'ArrowFunctionExpression:exit'(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.pop();
                }
            }
        });
    }
};
