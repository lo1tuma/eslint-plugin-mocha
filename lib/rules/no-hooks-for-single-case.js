'use strict';

const astUtil = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

function newDescribeLayer(describeNode) {
    return {
        describeNode,
        hookNodes: [],
        testCount: 0
    };
}

module.exports = {
    meta: {
        type: 'suggestion',
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
        const options = context.options[0] || {};
        const allowedHooks = options.allow || [];
        const settings = context.settings;
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
            const layer = layers[layers.length - 1];
            if (layer.describeNode === node) {
                if (layer.testCount <= 1) {
                    layer.hookNodes
                        .filter(function (hookNode) {
                            return allowedHooks.indexOf(hookNode.name) === -1;
                        })
                        .forEach(function (hookNode) {
                            context.report({
                                node: hookNode,
                                message: `Unexpected use of Mocha \`${ hookNode.name }\` hook for a single test case`
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
                if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                    increaseTestCount();
                    layers.push(newDescribeLayer(node));
                    return;
                }

                if (astUtil.isTestCase(node)) {
                    increaseTestCount();
                }

                if (astUtil.isHookIdentifier(node.callee)) {
                    layers[layers.length - 1].hookNodes.push(node.callee);
                }
            },

            'CallExpression:exit': popLayer,
            'Program:exit': popLayer
        };
    }
};
