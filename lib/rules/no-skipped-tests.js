'use strict';

const { getAdditionalTestFunctions, getAdditionalXFunctions } = require('../util/settings');

let mochaTestFunctions;
let mochaXFunctions;

function matchesMochaTestFunction(object) {
    return object && mochaTestFunctions.includes(object.name);
}

function isPropertyNamedSkip(property) {
    return property && (property.name === 'skip' || property.value === 'skip');
}

function isCallToMochasSkipFunction(callee) {
    return callee.type === 'MemberExpression' &&
       matchesMochaTestFunction(callee.object) &&
       isPropertyNamedSkip(callee.property);
}

function isMochaXFunction(name) {
    return mochaXFunctions.includes(name);
}

function isCallToMochaXFunction(callee) {
    return callee.type === 'Identifier' && isMochaXFunction(callee.name);
}

module.exports = {
    meta: {
        docs: {
            description: 'Disallow skipped tests'
        },
        type: 'problem'
    },
    create(context) {
        const settings = context.settings;
        const additionalTestFunctions = getAdditionalTestFunctions(settings);
        const additionalXFunctions = getAdditionalXFunctions(settings);

        mochaTestFunctions = [
            'it',
            'describe',
            'suite',
            'test',
            'context',
            'specify'
        ].concat(additionalTestFunctions);
        mochaXFunctions = [
            'xit',
            'xdescribe',
            'xcontext',
            'xspecify'
        ].concat(additionalXFunctions);

        return {
            CallExpression(node) {
                const callee = node.callee;

                if (isCallToMochasSkipFunction(callee)) {
                    context.report({
                        node: callee.property,
                        message: 'Unexpected skipped mocha test.'
                    });
                } else if (isCallToMochaXFunction(callee)) {
                    context.report({
                        node: callee,
                        message: 'Unexpected skipped mocha test.'
                    });
                }
            }
        };
    }
};
