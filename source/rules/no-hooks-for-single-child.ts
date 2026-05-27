import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { getLastOrThrow } from '../list.js';
import { getRuleOption } from '../rule-options.js';
import {
    allowMochaCallOptionSchema,
    defaultAllowMochaCallOption,
    normalizeMochaCallName,
    type ResolvedAllowMochaCallOption
} from './mocha-call-allowance.js';

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

export const noHooksForSingleChildRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow hooks with a single direct child',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-hooks-for-single-child.md'
        },
        defaultOptions: [defaultAllowMochaCallOption],
        messages: {
            unexpectedHookForSingleChild: 'Unexpected use of Mocha `{{name}}` hook with only one direct child.'
        },
        schema: [allowMochaCallOptionSchema]
    },
    create(context) {
        const { allow } = getRuleOption<ResolvedAllowMochaCallOption>(context);
        const allowedHooks = new Set(allow.map(normalizeMochaCallName));
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
                                messageId: 'unexpectedHookForSingleChild',
                                data: { name: hookNode.name }
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
                const currentLayer = getLastOrThrow(layers);

                currentLayer.hookNodes.push(visitorContext);
            }
        });
    }
};
