import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { isRecord } from '../record.js';

type Layer = {
    suiteNode: Except<Rule.Node, 'parent'>;
    hookNodes: VisitorContext[];
    testCount: number;
};

function newSuiteLayer(suiteNode: Except<Rule.Node, 'parent'>): Readonly<Layer> {
    return {
        suiteNode,
        hookNodes: [],
        testCount: 0
    };
}

function ensureEndsWithParens(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    if (!value.endsWith('()')) {
        return `${value}()`;
    }

    return value;
}

export const noHooksForSingleCaseRule: Readonly<Rule.RuleModule> = {
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
        const options = isRecord(context.options[0]) ? context.options[0] : {};
        const allowedHooks = new Set((Array.isArray(options.allow) ? options.allow : []).map(ensureEndsWithParens));
        let layers: Layer[] = [];

        function increaseTestCount(): void {
            layers = layers.map((layer) => {
                return {
                    suiteNode: layer.suiteNode,
                    hookNodes: layer.hookNodes,
                    testCount: layer.testCount + 1
                };
            });
        }

        function popLayer(node: Except<Rule.Node, 'parent'>): void {
            const layer = layers.at(-1);
            if (layer?.suiteNode === node) {
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
                popLayer(visitorContext.node);
            },

            Program(node) {
                layers.push(newSuiteLayer(node));
            },

            'Program:exit': popLayer,

            hook(visitorContext) {
                const currentLayer = layers.at(-1);
                currentLayer?.hookNodes.push(visitorContext);
            }
        });
    }
};
