import { createAstUtils } from '../util/ast.js';

function newDescribeLayer(describeNode) {
    return {
        describeNode,
        hookNodes: [],
        testCount: 0
    };
}

export const noHooksForSingleCaseRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow hooks for a single test or test suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-hooks-for-single-case.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allow: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                }
            }
        ]
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        const isTestCase = astUtils.buildIsTestCaseAnswerer();
        const isDescribe = astUtils.buildIsDescribeAnswerer();

        const options = context.options[0] || {};
        const allowedHooks = options.allow || [];
        let layers = [];

        function increaseTestCount() {
            layers = layers.map((layer) => {
                return {
                    describeNode: layer.describeNode,
                    hookNodes: layer.hookNodes,
                    testCount: layer.testCount + 1
                };
            });
        }

        function popLayer(node) {
            const layer = layers.at(-1);
            if (layer.describeNode === node) {
                if (layer.testCount <= 1) {
                    layer
                        .hookNodes
                        .filter((hookNode) => {
                            return !allowedHooks.includes(hookNode.name);
                        })
                        .forEach((hookNode) => {
                            context.report({
                                node: hookNode,
                                message: `Unexpected use of Mocha \`${hookNode.name}\` hook for a single test case`
                            });
                        });
                }
                layers.pop();
            }
        }

        return {
            Program(node) {
                layers.push(newDescribeLayer(node));
            },

            CallExpression(node) {
                if (isDescribe(node)) {
                    increaseTestCount();
                    layers.push(newDescribeLayer(node));
                    return;
                }

                if (isTestCase(node)) {
                    increaseTestCount();
                }

                if (astUtils.isHookIdentifier(node.callee)) {
                    layers.at(-1).hookNodes.push(node.callee);
                }
            },

            'CallExpression:exit': popLayer,
            'Program:exit': popLayer
        };
    }
};
