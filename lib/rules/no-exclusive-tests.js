module.exports = function (context) {
    'use strict';

    function isCallToMochasOnlyFunction(callee) {
        return callee.type === 'MemberExpression' &&
               isObjectNamedItOrDescribe(callee.object) &&
               isPropertyNamedOnly(callee.property);
    }

    function isObjectNamedItOrDescribe(object) {
        return object && (object.name === 'it' || object.name === 'describe');
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
