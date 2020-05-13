'use strict';

const { getAdditionalTestFunctions } = require('../util/settings');
const astUtils = require('../util/ast');

module.exports = {
    meta: {
        type: 'problem'
    },
    create(context) {
        let mochaTestFunctions = [
            'it',
            'describe',
            'suite',
            'test',
            'context',
            'specify'
        ];
        const settings = context.settings;
        const additionalTestFunctions = getAdditionalTestFunctions(settings);

        mochaTestFunctions = mochaTestFunctions.concat(additionalTestFunctions);

        function matchesMochaTestFunction(object) {
            const name = astUtils.getNodeName(object);

            return mochaTestFunctions.indexOf(name) !== -1;
        }

        function isPropertyNamedOnly(property) {
            return property && astUtils.getPropertyName(property) === 'only';
        }

        function isCallToMochasOnlyFunction(callee) {
            return callee.type === 'MemberExpression' &&
                matchesMochaTestFunction(callee.object) &&
                isPropertyNamedOnly(callee.property);
        }

        return {
            CallExpression(node) {
                const callee = node.callee;

                if (callee && isCallToMochasOnlyFunction(callee)) {
                    context.report({
                        node: callee.property,
                        message: 'Unexpected exclusive mocha test.'
                    });
                }
            }
        };
    }
};
