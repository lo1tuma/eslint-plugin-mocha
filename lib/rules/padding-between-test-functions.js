
'use strict';

var R = require('ramda'),
    astUtil = require('../util/ast');

/**
 * Checks if there is padding between two tokens
 * @param {Token} first The first token
 * @param {Token} second The second token
 * @returns {boolean} True if there is at least a line between the tokens
 */
function isPaddingBetweenTokens(first, second) {
    return second.loc.start.line - first.loc.end.line >= 2;
}

/**
 * Returns a fixer function for replacing multiple new lines with a single one.
 * @param {Range} first first range to work against
 * @param {Range} second second range to work against
 * @returns {function} fixer function.
 */
function removeEmptyLinesBetweenTokens(first, second) {
    return function (fixer) {
        return fixer.replaceTextRange([ first.range[1], second.range[0] ], '\n');
    };
}

/**
 * Returns a function used to check top-padding.
 * @param {*} sourceCode sourceCode from eslint plugin api.
 * @param {string} opt always or never.
 * @param {string} message message to use for error reporting.
 * @returns {function} reporting function that returns array of errors.
 */
function getTopChecker(sourceCode, opt, message) {
    return function (node) {
        var firstToken = sourceCode.getFirstToken(node),
        tokenBeforeFirst = sourceCode.getTokenBefore(firstToken, { includeComments: true }),
        blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstToken),
        errors = [];

        if (blockHasTopPadding && opt === 'never') {
            errors.push({
                start: tokenBeforeFirst,
                end: firstToken,
                message: message,
                fix: removeEmptyLinesBetweenTokens(tokenBeforeFirst, firstToken)
            });
        }

        if (!blockHasTopPadding && opt === 'always') {
            errors.push({
                start: tokenBeforeFirst,
                end: firstToken,
                message: message,
                fix: function (fixer) {
                    return fixer.insertTextBefore(firstToken, '\n');
                }
            });
        }

        return errors;
    };
}

/**
 * Returns a function used to check top-padding.
 * @param {*} sourceCode sourceCode from eslint plugin api.
 * @param {string} opt always or never.
 * @param {string} message message to use for error reporting.
 * @returns {function} reporting function that returns array of errors.
 */
function getBottomChecker(sourceCode, opt, message) {
    return function (node) {
        var lastToken = sourceCode.getLastToken(node),
        tokenAfterLast = sourceCode.getTokenAfter(lastToken, { includeComments: true }),
        blockHasBottomPadding = isPaddingBetweenTokens(lastToken, tokenAfterLast),
        errors = [];

        if (blockHasBottomPadding && opt === 'never') {
            errors.push({
                start: lastToken,
                end: tokenAfterLast,
                message: message,
                fix: removeEmptyLinesBetweenTokens(lastToken, tokenAfterLast)
            });
        }

        if (!blockHasBottomPadding && opt === 'always') {
            errors.push({
                start: lastToken,
                end: tokenAfterLast,
                message: message,
                fix: function (fixer) {
                    return fixer.insertTextAfter(lastToken, '\n');
                }
            });
        }

        return errors;
    };
}

module.exports = {
    meta: {
        docs: {
            description: 'Enforce spacing between test functions',
            category: 'Stylistic Issues',
            recommended: false
        },
        fixable: 'whitespace',
        schema: [ {
            oneOf: [ {
                enum: [ 'always', 'never' ]
            } ]
        } ]
    },
    create: function (context) {
        var option = context.options[0] || 'always',
            message = option === 'never'
                ? 'Test functions must not be padded by blank lines.'
                : 'Test functions must be padded by blank lines.',
            sourceCode = context.getSourceCode(),
            topChecker = getTopChecker(sourceCode, option, message),
            bottomChecker = getBottomChecker(sourceCode, option, message),
            errors = [];

        return {
            'Program:exit': function () {
                R.pipe(
                  R.uniqWith(function (a, b) {
                      return a.start.start === b.start.start && a.end.end === b.end.end;
                  }),
                  R.map(function (error) {
                      return {
                          message: error.message,
                          loc: {
                              start: error.start.loc.end,
                              end: error.end.loc.start
                          },
                          fix: error.fix
                      };
                  }),
                  R.forEach(function (error) {
                      context.report(error);
                  })
                )(errors);
            },
            ExpressionStatement: function (node) {
                var tokenBefore = sourceCode.getTokenBefore(node),
                    tokenAfter = sourceCode.getTokenAfter(node);

                if (!tokenBefore || !tokenAfter || !astUtil.isTestFunction(node.expression)) {
                    return;
                }

                errors = R.reduce(
                    R.concat,
                    errors,
                    [ topChecker(node), bottomChecker(node) ]
                );
            }
        };
    }
};
