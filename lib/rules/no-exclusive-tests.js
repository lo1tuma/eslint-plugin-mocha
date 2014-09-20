module.exports = function (context) {
    'use strict';

    var mochaTestFunctions = [
        'it',
        'describe',
        'suite',
        'test'
    ];

    function isCallToMochasOnlyFunction(callee) {
        return callee.type === 'MemberExpression' &&
           matchesMochaTestFunction(callee.object) &&
           isPropertyNamedOnly(callee.property);
    }

    function matchesMochaTestFunction(object) {
        return object && mochaTestFunctions.indexOf(object.name) !== -1;
    }

    function isPropertyNamedOnly(property) {
        return property && (property.name === 'only' || property.value === 'only');
    }

    return {
        'CallExpression': function (node) {
            var callee = node.callee;

            if (callee && isCallToMochasOnlyFunction(callee)) {
                context.report(callee.property, 'Unexpected exclusive mocha test.');
            }
        }
    };
};
