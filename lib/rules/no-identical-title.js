const createAstUtils = require('../util/ast');

function newLayer() {
    return {
        describeTitles: [],
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

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow identical titles',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-identical-title.md'
        },
        schema: []
    },
    create(context) {
        const astUtils = createAstUtils(context.settings);
        const isTestCase = astUtils.buildIsTestCaseAnswerer();
        const isDescribe = astUtils.buildIsDescribeAnswerer();

        const titleLayers = [newLayer()];

        function handleTestCaseTitles(titles, node, title) {
            if (isTestCase(node)) {
                if (titles.includes(title)) {
                    context.report({
                        node,
                        message: 'Test title is used multiple times in the same test suite.'
                    });
                }
                titles.push(title);
            }
        }

        function handleTestSuiteTitles(titles, node, title) {
            if (!isDescribe(node)) {
                return;
            }
            if (titles.includes(title)) {
                context.report({
                    node,
                    message: 'Test suite title is used multiple times.'
                });
            }
            titles.push(title);
        }

        return {
            CallExpression(node) {
                const currentLayer = titleLayers.at(-1);

                if (isDescribe(node)) {
                    titleLayers.push(newLayer());
                }
                if (!isFirstArgLiteral(node)) {
                    return;
                }

                const title = node.arguments[0].value;
                handleTestCaseTitles(currentLayer.testTitles, node, title);
                handleTestSuiteTitles(currentLayer.describeTitles, node, title);
            },
            'CallExpression:exit'(node) {
                if (isDescribe(node)) {
                    titleLayers.pop();
                }
            }
        };
    }
};
