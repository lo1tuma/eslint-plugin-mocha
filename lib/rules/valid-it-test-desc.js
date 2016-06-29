'use strict';

/**
 * @fileoverview Check "it()" and "test()" descriptions to match a pre-configured regular expression
 * @author Alexander Afanasyev
 */

module.exports = function (context) {
    var pattern = context.options[0] ? new RegExp(context.options[0]) : /^should/;

    return {
        CallExpression: function (node) {
            var callee = node.callee,
                args;

            if (callee && callee.name && (callee.name === 'it' || callee.name === 'test')) {
                args = node.arguments;
                if (args && args[0] && typeof args[0].value === 'string' && !pattern.test(args[0].value)) {
                    context.report(node, 'Invalid "' + callee.name + '()" description found.');
                }
            }
        }
    };
};
