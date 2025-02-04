import { createMochaVisitors } from '../ast/mochaVisitors.js';

function createNewLayer(node) {
    return {
        suiteNode: node,
        alreadyUsedHooks: new Set()
    };
}

export const noSiblingHooksRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow duplicate uses of a hook at the same level inside a suite',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-sibling-hooks.md'
        },
        schema: []
    },
    create(context) {
        const layers = [];

        return createMochaVisitors(context, {
            Program(node) {
                layers.push(createNewLayer(node));
            },

            suite(visitorContext) {
                layers.push(createNewLayer(visitorContext.node));
            },

            'suite:exit'() {
                layers.pop();
            },

            hook(visitorContext) {
                const { name, node } = visitorContext;
                const currentLayer = layers.at(-1);

                if (currentLayer.alreadyUsedHooks.has(name)) {
                    context.report({
                        node,
                        message: `Unexpected use of duplicate Mocha \`${name}\` hook`
                    });
                } else {
                    currentLayer.alreadyUsedHooks.add(name);
                }
            }
        });
    }
};
