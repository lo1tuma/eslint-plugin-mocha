import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

type Layer = {
    suiteNode: Except<Rule.Node, 'parent'>;
    isProgram: boolean;
    functionDepth: number;
    alreadyUsedHooks: Set<string>;
};

function createNewLayer(
    node: Except<Rule.Node, 'parent'>,
    isProgram: boolean,
    functionDepth: number
): Readonly<Layer> {
    return {
        suiteNode: node,
        isProgram,
        functionDepth,
        alreadyUsedHooks: new Set()
    };
}

function isInLayerBody(layer: Readonly<Layer> | undefined, functionDepth: number): boolean {
    return layer !== undefined && (layer.isProgram || layer.functionDepth === functionDepth);
}

export const noSiblingHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow duplicate uses of a hook at the same level inside a suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-sibling-hooks.md'
        },
        messages: {
            unexpectedDuplicateHook: 'Unexpected use of duplicate Mocha `{{name}}` hook'
        },
        schema: []
    },
    create(context) {
        const layers: Layer[] = [];
        const suiteCallbackNodes = new Set<Rule.Node>();
        let functionDepth = 0;

        function enterFunction(node: Rule.Node): void {
            if (!suiteCallbackNodes.has(node)) {
                functionDepth += 1;
            }
        }

        function exitFunction(node: Rule.Node): void {
            if (!suiteCallbackNodes.has(node)) {
                functionDepth -= 1;
            }
        }

        return createMochaVisitors(context, {
            Program(node) {
                layers.push(createNewLayer(node, true, functionDepth));
            },

            suite(visitorContext) {
                layers.push(createNewLayer(visitorContext.node, false, functionDepth));
            },

            'suite:exit'() {
                layers.pop();
            },

            suiteCallback(visitorContext) {
                suiteCallbackNodes.add(visitorContext.node);
            },

            hook(visitorContext) {
                const { name, node } = visitorContext;
                const currentLayer = layers.at(-1);

                if (!isInLayerBody(currentLayer, functionDepth)) {
                    return;
                }

                if (currentLayer?.alreadyUsedHooks.has(name) === true) {
                    context.report({
                        node,
                        messageId: 'unexpectedDuplicateHook',
                        data: { name }
                    });
                } else {
                    currentLayer?.alreadyUsedHooks.add(name);
                }
            },

            FunctionDeclaration: enterFunction,
            'FunctionDeclaration:exit': exitFunction,
            FunctionExpression: enterFunction,
            'FunctionExpression:exit': exitFunction,
            ArrowFunctionExpression: enterFunction,
            'ArrowFunctionExpression:exit': exitFunction
        });
    }
};
