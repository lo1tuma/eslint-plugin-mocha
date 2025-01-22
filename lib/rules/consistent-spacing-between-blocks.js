import { createMochaVisitors } from '../ast/mochaVisitors.js';

const minimumAmountOfLinesBetweenNeeded = 2;

function isFirstStatementInScope(node) {
    return node.parent.parent.body[0] === node.parent;
}

export const consistentSpacingBetweenBlocksRule = {
    meta: {
        type: 'suggestion',
        fixable: 'whitespace',
        schema: [],
        docs: {
            description: 'Require consistent spacing between blocks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/' +
                'consistent-spacing-between-blocks.md'
        }
    },

    create(context) {
        const layers = [{ entities: [] }];
        const sourceCode = context.getSourceCode();

        function addEntityToCurrentLayer(visitorContext) {
            const currentLayer = layers.at(-1);
            currentLayer.entities.push(visitorContext);
        }

        function checkCurrentLayer() {
            const currentLayer = layers.at(-1);

            for (const entity of currentLayer.entities) {
                const { node } = entity;
                const beforeToken = sourceCode.getTokenBefore(node);

                if (!isFirstStatementInScope(node) && beforeToken) {
                    const linesBetween = node.loc.start.line - beforeToken.loc.end.line;

                    if (linesBetween < minimumAmountOfLinesBetweenNeeded) {
                        context.report({
                            node,
                            message: 'Expected line break before this statement.',
                            fix(fixer) {
                                return fixer.insertTextAfter(
                                    beforeToken,
                                    linesBetween === 0 ? '\n\n' : '\n'
                                );
                            }
                        });
                    }
                }
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
                layers.push({ entities: [] });
            },

            'suite:exit'() {
                checkCurrentLayer();
                layers.pop();
            },

            'Program:exit'() {
                checkCurrentLayer();
            },

            testCase(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            },

            hook(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            }
        });
    }
};
