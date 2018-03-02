'use strict';

/**
 * @fileoverview Match test descriptions to match a pre-configured regular expression
 * @author Alexander Afanasyev
 */

var defaultTestNames = [ 'it', 'test', 'specify' ];

module.exports = function (context) {
    var pattern = context.options[0] ? new RegExp(context.options[0]) : /^should/,
        testNames = context.options[1] ? context.options[1] : defaultTestNames;

    function isTest(node) {
        return node.callee && node.callee.name && testNames.indexOf(node.callee.name) > -1;
    }

    return {
        CallExpression: function (node) {
            var callee = node.callee,
                args;

            if (isTest(node)) {
                args = node.arguments;
                if (args && args[0] && typeof args[0].value === 'string' && !pattern.test(args[0].value)) {
                    context.report(node, 'Invalid "' + callee.name + '()" description found.');
                }
            }
        }
    };
};
