import { createAstUtils } from '../util/ast.js';

export const noTopLevelHooksRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow top-level hooks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-top-level-hooks.md'
        },
        schema: []
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        const testSuiteStack = [];

        return {
            CallExpression(node) {
                if (astUtils.isDescribe(node)) {
                    testSuiteStack.push(node);
                    return;
                }

                if (!astUtils.isHookIdentifier(node.callee)) {
                    return;
                }

                if (testSuiteStack.length === 0) {
                    context.report({
                        node: node.callee,
                        message: `Unexpected use of Mocha \`${node.callee.name}\` hook outside of a test suite`
                    });
                }
            },

            'CallExpression:exit'(node) {
                if (testSuiteStack.at(-1) === node) {
                    testSuiteStack.pop();
                }
            }
        };
    }
};
