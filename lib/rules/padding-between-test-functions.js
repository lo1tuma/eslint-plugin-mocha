
'use strict';

var names = [
    'describe',
    'context',
    'it',
    'specify',
    'before',
    'after',
    'beforeEach',
    'afterEach',
    'suite',
    'test',
    'suiteSetup',
    'suiteTeardown',
    'setup',
    'teardown'
];

/**
 * Checks if a node is a test function expression, or object (e.g., it() or it.only())
 * @param {Node} node node to check
 * @returns {boolean} True if the node is a test function expression
 */
function isTestFunction(node) {
  return (
    node &&
    node.expression &&
    node.expression.callee && (
        names.indexOf(node.expression.callee.name) > -1 ||
        node.expression.callee.object && names.indexOf(node.expression.callee.object.name) > -1
    )
  );
}

/**
 * Checks if there is padding between two tokens
 * @param {Token} first The first token
 * @param {Token} second The second token
 * @returns {boolean} True if there is at least a line between the tokens
 */
function isPaddingBetweenTokens(first, second) {
    return second.loc.start.line - first.loc.end.line >= 2;
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
        var opt = context.options[0] || 'always',
        message = opt === 'never'
            ? 'Test functions must not be padded by blank lines.'
            : 'Test functions must be padded by blank lines.',
        sourceCode = context.getSourceCode();

        return {
            ExpressionStatement: function (node) {
                var firstToken = sourceCode.getFirstToken(node),
                    tokenBeforeFirst = sourceCode.getTokenBefore(firstToken, { includeComments: true }),
                    lastToken = sourceCode.getLastToken(node),
                    tokenAfterLast = sourceCode.getTokenAfter(lastToken, { includeComments: true });

                function shouldReturn() {
                    return (
                        !sourceCode.getTokenBefore(node) ||
                        !sourceCode.getTokenAfter(node) ||
                        !isTestFunction(node)
                    );
                }

                function always() {
                    var blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstToken),
                        blockHasBottomPadding = isPaddingBetweenTokens(lastToken, tokenAfterLast);
                    if (!blockHasTopPadding) {
                        context.report({
                            node: node,
                            message: message,
                            fix: function (fixer) {
                                return fixer.insertTextBefore(firstToken, '\n');
                            }
                        });
                    }
                    if (!blockHasBottomPadding) {
                        context.report({
                            node: node,
                            message: message,
                            fix: function (fixer) {
                                return fixer.insertTextAfter(lastToken, '\n');
                            }
                        });
                    }
                }

                function never() {
                    var blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstToken),
                        blockHasBottomPadding = isPaddingBetweenTokens(lastToken, tokenAfterLast);
                    if (blockHasTopPadding) {
                        context.report({
                            node: node,
                            message: message,
                            fix: function (fixer) {
                                return fixer.replaceTextRange([ tokenBeforeFirst.range[1], firstToken.range[0] ], '\n');
                            }
                        });
                    }
                    if (blockHasBottomPadding) {
                        context.report({
                            node: node,
                            message: message,
                            fix: function (fixer) {
                                return fixer.replaceTextRange([ lastToken.range[1], tokenAfterLast.range[0] ], '\n');
                            }
                        });
                    }
                }

                if (shouldReturn(node)) {
                    return;
                }

                if (opt === 'never') {
                    never();
                }
                if (opt === 'always') {
                    always();
                }
            }
        };
    }
};
