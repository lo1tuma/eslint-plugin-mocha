'use strict';

/**
 * @fileoverview Limit the number of top-level suites in a single file
 * @author Alexander Afanasyev
 */

const isNil = require('ramda/src/isNil');
const astUtil = require('../util/ast');
const { additionalSuiteNames } = require('../util/settings');

const defaultSuiteLimit = 1;

function isTopLevelScope(scope) {
    return scope.type === 'module' || scope.upper === null;
}

module.exports = {
    meta: {
        type: 'suggestion',
        schema: [
            {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const topLevelDescribes = [];
        const options = context.options[0] || {};
        const settings = context.settings;
        let suiteLimit;

        if (isNil(options.limit)) {
            suiteLimit = defaultSuiteLimit;
        } else {
            suiteLimit = options.limit;
        }

        return {
            CallExpression(node) {
                if (astUtil.isDescribe(node, additionalSuiteNames(settings))) {
                    const scope = context.getScope();

                    if (isTopLevelScope(scope)) {
                        topLevelDescribes.push(node);
                    }
                }
            },

            'Program:exit'() {
                if (topLevelDescribes.length > suiteLimit) {
                    context.report({
                        node: topLevelDescribes[suiteLimit],
                        message: `The number of top-level suites is more than ${ suiteLimit }.`
                    });
                }
            }
        };
    }
};
