import { createMochaVisitors } from '../ast/mochaVisitors.js';

function newSuiteLayer(suiteNode) {
    return {
        suiteNode,
        hookNodes: [],
        testCount: 0
    };
}

function ensureEndsWithParens(value) {
    if (!value.endsWith('()')) {
        return `${value}()`;
    }

    return value;
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
        const options = context.options[0] || {};
        const allowedHooks = new Set((options.allow || []).map(ensureEndsWithParens));
        let layers = [];

        function increaseTestCount() {
            layers = layers.map((layer) => {
                return {
                    suiteNode: layer.suiteNode,
                    hookNodes: layer.hookNodes,
                    testCount: layer.testCount + 1
                };
            });
        }

        function popLayer(node) {
            const layer = layers.at(-1);
            if (layer.suiteNode === node) {
                if (layer.testCount <= 1) {
                    layer
                        .hookNodes
                        .filter((hookNode) => {
                            return !allowedHooks.has(hookNode.name);
                        })
                        .forEach((hookNode) => {
                            context.report({
                                node: hookNode.node,
                                message: `Unexpected use of Mocha \`${hookNode.name}\` hook for a single test case`
                            });
                        });
                }
                layers.pop();
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                increaseTestCount();
                layers.push(newSuiteLayer(visitorContext.node));
            },

            testCase() {
                increaseTestCount();
            },

            'anyTestEntity:exit'(visitorContext) {
                popLayer(visitorContext.node, visitorContext.name);
            },

            Program(node) {
                layers.push(newSuiteLayer(node));
            },

            'Program:exit': popLayer,

            hook(visitorContext) {
                const currentLayer = layers.at(-1);
                currentLayer.hookNodes.push(visitorContext);
            }
        });
    }
};
