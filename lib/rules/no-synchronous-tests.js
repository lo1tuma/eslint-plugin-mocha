'use strict';

var R = require('ramda'),
    defaultAllowedAsyncMethods = [ 'async', 'callback', 'promise' ],
    possibleAsyncFunctionNames = [
        'it',
        'it.only',
        'test',
        'test.only',
        'specify',
        'specify.only',
        'before',
        'after',
        'beforeEach',
        'afterEach'
    ];

function getCalleeName(callee) {
    if (callee.type === 'MemberExpression') {
        return callee.object.name + '.' + callee.property.name;
    }

    return callee.name;
}

function hasParentMochaFunctionCall(functionExpression) {
    var name;

    if (functionExpression.parent && functionExpression.parent.type === 'CallExpression') {
        name = getCalleeName(functionExpression.parent.callee);
        return possibleAsyncFunctionNames.indexOf(name) > -1;
    }

    return false;
}

function hasAsyncCallback(functionExpression) {
    return functionExpression.params.length === 1;
}

function isAsyncFunction(functionExpression) {
    return functionExpression.async === true;
}

function findPromiseReturnStatement(nodes) {
    return R.find(function (node) {
        return node.type === 'ReturnStatement' && node.argument && node.argument.type !== 'Literal';
    }, nodes);
}

function doesReturnPromise(functionExpression) {
    var bodyStatement = functionExpression.body,
        returnStatement = null;

    if (bodyStatement.type === 'BlockStatement') {
        returnStatement = findPromiseReturnStatement(functionExpression.body.body);
    } else if (bodyStatement.type === 'CallExpression') {
        //  allow arrow statements calling a promise with implicit return.
        returnStatement = bodyStatement;
    }

    return returnStatement !== null
        && typeof returnStatement !== 'undefined';
}

function getAllowedAsyncMethocsFromOptions(options) {
    if (R.isNil(options.allowed)) {
        return defaultAllowedAsyncMethods;
    }

    /* istanbul ignore if */
    if (!Array.isArray(options.allowed) || options.allowed.length === 0) {
        throw new Error('The `allowed` option for no-synchronous-tests must be a non-empty array.');
    }

    return options.allowed;
}

module.exports = function (context) {
    var options = context.options[0] || {},
        allowedAsyncMethods = getAllowedAsyncMethocsFromOptions(options);

    function check(node) {
        var testAsyncMethods,
            isAsyncTest;

        if (hasParentMochaFunctionCall(node)) {
            // For each allowed async test method, check if it is used in the test
            testAsyncMethods = allowedAsyncMethods.map(function (method) {
                switch (method) {
                    case 'async':
                        return isAsyncFunction(node);

                    case 'callback':
                        return hasAsyncCallback(node);

                    case 'promise':
                        return doesReturnPromise(node);

                    /* istanbul ignore next */
                    default:
                        throw new Error(
                            'Unknown async test method "' + method + '".' +
                            'Possible values: ' + defaultAllowedAsyncMethods.join(', ')
                        );
                }
            });

            // Check that at least one allowed async test method is used in the test
            isAsyncTest = testAsyncMethods.some(function (value) {
                return value === true;
            });

            if (!isAsyncTest) {
                context.report(node, 'Unexpected synchronous test.');
            }
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
