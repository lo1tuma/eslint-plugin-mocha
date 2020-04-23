'use strict';

const astUtil = require('../util/ast');

module.exports = {
    meta: {
        type: 'suggestion',
        schema: [
            {
                type: 'object',
                properties: {
                    allow: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                },
                additionalProperties: false
            }
        ]
    },

    create(context) {
        const [ config = {} ] = context.options;
        const { allow = [] } = config;

        return {
            CallExpression(node) {
                const isHookAllowed = allow.includes(node.callee.name);

                if (astUtil.isHookIdentifier(node.callee) && !isHookAllowed) {
                    context.report({
                        node: node.callee,
                        message: `Unexpected use of Mocha \`${ node.callee.name }\` hook`
                    });
                }
            }
        };
    }
};
