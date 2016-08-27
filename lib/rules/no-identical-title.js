'use strict';

var astUtil = require('../util/ast');

function newLayer() {
    return {
        describeTitles: [],
        testTitles: []
    };
}

function handlTestCaseTitles(context, titles, node, title) {
    if (astUtil.isTestCase(node)) {
        if (titles.indexOf(title) !== -1) {
            context.report({
                node: node,
                message: 'Test title is used multiple times in the same test suite.'
            });
        }
        titles.push(title);
    }
}

function handlTestSuiteTitles(context, layers, node, title) {
    var currentLayer = layers[layers.length - 1];
    if (astUtil.isDescribe(node)) {
        if (currentLayer.describeTitles.indexOf(title) !== -1) {
            context.report({
                node: node,
                message: 'Test suite title is used multiple times.'
            });
        }
        currentLayer.describeTitles.push(title);
        layers.push(newLayer());
    }
}

module.exports = function (context) {
    var titleLayers = [
        newLayer()
    ];
    return {
        CallExpression: function (node) {
            var currentLayer = titleLayers[titleLayers.length - 1],
                title;
            if (!node.arguments || !node.arguments[0] || node.arguments[0].type !== 'Literal') {
                return;
            }

            title = node.arguments[0].value;
            handlTestCaseTitles(context, currentLayer.testTitles, node, title);
            handlTestSuiteTitles(context, titleLayers, node, title);
        },
        'CallExpression:exit': function (node) {
            if (astUtil.isDescribe(node)) {
                titleLayers.pop();
            }
        }
    };
};
