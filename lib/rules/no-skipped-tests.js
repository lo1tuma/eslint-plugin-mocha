'use strict';

module.exports = function (context) {
    var mochaTestFunctions = [
            'it',
            'describe',
            'suite',
            'test',
            'context',
            'specify'
        ],
        mochaXFunctions = [
            'xit',
            'xdescribe',
            'xcontext',
            'xspecify'
        ];

    function matchesMochaTestFunction(object) {
        return object && mochaTestFunctions.indexOf(object.name) !== -1;
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
        return mochaXFunctions.indexOf(name) !== -1;
    }

    function isCallToMochaXFunction(callee) {
        return callee.type === 'Identifier' && isMochaXFunction(callee.name);
    }

    function createSkipAutofixFunction(callee) {
        var endRangeOfMemberExpression = callee.range[1],
            endRangeOfMemberExpressionObject = callee.object.range[1],
            rangeToRemove = [ endRangeOfMemberExpressionObject, endRangeOfMemberExpression ];

        return function removeSkipProperty(fixer) {
            return fixer.removeRange(rangeToRemove);
        };
    }

    function createXAutofixFunction(callee) {
        var rangeToRemove = [ callee.range[0], callee.range[0] + 1 ];

        return function removeXPrefix(fixer) {
            return fixer.removeRange(rangeToRemove);
        };
    }

    return {
        CallExpression: function (node) {
            var callee = node.callee;

            if (callee && isCallToMochasSkipFunction(callee)) {
                context.report({
                    node: callee.property,
                    message: 'Unexpected skipped mocha test.',
                    fix: createSkipAutofixFunction(callee)
                });
            } else if (callee && isCallToMochaXFunction(callee)) {
                context.report({
                    node: callee,
                    message: 'Unexpected skipped mocha test.',
                    fix: createXAutofixFunction(callee)
                });
            }
        }
    };
};
