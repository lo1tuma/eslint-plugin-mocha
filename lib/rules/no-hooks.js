'use strict';

module.exports = function (context) {
    var hooks = [ 'before', 'after', 'beforeEach', 'afterEach' ];

    return {
        CallExpression: function (node) {
            if (node.callee.type === 'Identifier' && hooks.indexOf(node.callee.name) !== -1) {
                context.report({
                    node: node.callee,
                    message: 'Unexpected use of Mocha `' + node.callee.name + '` hook'
                });
            }
        }
    };
};
