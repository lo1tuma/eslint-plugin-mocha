'use strict';

const astUtil = require('../util/ast');

module.exports = {
    create(context) {
        return {
            CallExpression(node) {
                if (astUtil.isHookIdentifier(node.callee)) {
                    context.report({
                        node: node.callee,
                        message: `Unexpected use of Mocha \`${ node.callee.name }\` hook`
                    });
                }
            }
        };
    }
};
