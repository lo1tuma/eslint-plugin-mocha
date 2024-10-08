import { createAstUtils } from '../util/ast.js';

const FUNCTION = 1;
const DESCRIBE = 2;
// "Pure" nodes are hooks (like `beforeEach`) or `it` calls
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
        const astUtils = createAstUtils(context.settings);
        const isDescribe = astUtils.buildIsDescribeAnswerer();
        const isTestCase = astUtils.buildIsTestCaseAnswerer();

        function isPureNode(node) {
            return (
                astUtils.isHookCall(node) ||
                isTestCase(node) ||
                astUtils.isSuiteConfigCall(node)
            );
        }

        function handleCallExpressionInDescribe(node) {
            if (isPureNode(node)) {
                nesting.push(PURE);
            } else if (isNestedInDescribeBlock(nesting)) {
                reportCallExpression(context, node);
            }
        }

        function isParentDescribe(node) {
            return isDescribe(node.parent);
        }

        return {
            CallExpression(node) {
                if (isDescribe(node)) {
                    nesting.push(DESCRIBE);
                    return;
                }
                // don't process anything else if the first describe hasn't been processed
                if (nesting.length === 0) {
                    return;
                }
                handleCallExpressionInDescribe(node);
            },

            'CallExpression:exit'(node) {
                if (isDescribe(node) || nesting.length > 0 && isPureNode(node)) {
                    nesting.pop();
                }
            },

            MemberExpression(node) {
                if (
                    !isDescribe(node.parent) &&
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
                if (nesting.length > 0 && !isParentDescribe(node)) {
                    nesting.push(FUNCTION);
                }
            },
            'FunctionExpression:exit'(node) {
                if (nesting.length > 0 && !isParentDescribe(node)) {
                    nesting.pop();
                }
            },

            ArrowFunctionExpression(node) {
                if (nesting.length > 0 && !isParentDescribe(node)) {
                    nesting.push(FUNCTION);
                }
            },
            'ArrowFunctionExpression:exit'(node) {
                if (nesting.length > 0 && !isParentDescribe(node)) {
                    nesting.pop();
                }
            }
        };
    }
};
