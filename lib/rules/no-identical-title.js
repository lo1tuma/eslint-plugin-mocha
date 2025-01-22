import { createMochaVisitors } from '../ast/mochaVisitors.js';

function newLayer() {
    return {
        suiteTitles: [],
        testTitles: []
    };
}

function isFirstArgLiteral(node) {
    return (
        node.arguments &&
        node.arguments[0] &&
        node.arguments[0].type === 'Literal'
    );
}

function extractTitleArgument(node) {
    if (isFirstArgLiteral(node)) {
        return node.arguments[0].value;
    }

    return null;
}

export const noIdenticalTitleRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow identical titles',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-identical-title.md'
        },
        schema: []
    },
    create(context) {
        const titleLayers = [newLayer()];

        function handleTestCaseTitles(visitorContext, title) {
            const currentLayer = titleLayers.at(-1);
            const titles = currentLayer.testTitles;

            if (titles.includes(title)) {
                context.report({
                    node: visitorContext.node,
                    message: 'Test title is used multiple times in the same test suite.'
                });
            }
            titles.push(title);
        }

        function handleTestSuiteTitles(visitorContext, title) {
            const currentLayer = titleLayers.at(-1);
            const titles = currentLayer.suiteTitles;

            if (titles.includes(title)) {
                context.report({
                    node: visitorContext.node,
                    message: 'Test suite title is used multiple times.'
                });
            }
            titles.push(title);
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const title = extractTitleArgument(visitorContext.node);

                if (title !== null) {
                    handleTestSuiteTitles(visitorContext, title);
                }

                titleLayers.push(newLayer());
            },

            'suite:exit'() {
                titleLayers.pop();
            },

            testCase(visitorContext) {
                const title = extractTitleArgument(visitorContext.node);

                if (title === null) {
                    return;
                }

                handleTestCaseTitles(visitorContext, title);
            }
        });
    }
};
