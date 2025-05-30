/* eslint-disable @stylistic/indent -- needed */
/* eslint-disable @stylistic/generator-star-spacing -- needed */
/* eslint-disable max-statements -- needed */
/*
 * relax complexity and max-statements eslint rules in order to preserve the imported
 * core eslint `prefer-arrow-callback` rule code so that future updates to that code
 * can be more easily applied here.
 */
/* eslint "complexity": [ "error", 24 ], "max-statements": [ "error", 15 ], "no-warning-comments": [ "off" ] -- the rule is copied from ESLint core and just slightly modified that’s why we accept those complexity issues for now */

/**
 * @fileoverview A rule to suggest using arrow functions as callbacks.
 * @author Toru Nagashima (core eslint rule)
 * @author Michael Fields (mocha-aware rule modifications)
 */
import type { AST, Rule, Scope, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type CallExpression, isCallExpression, type MetaProperty, type Pattern } from '../ast/node-types.js';
import { isRecord } from '../record.js';

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Checks if the given token is an opening parenthesis token or not.
 */
function isOpeningParenToken(token: Readonly<AST.Token>): boolean {
    /* c8 ignore next */
    return token.value === '(' && token.type === 'Punctuator';
}

function isNotClosingParenToken(token: Readonly<AST.Token>): boolean {
    /* c8 ignore next */
    return !(token.value === ')' && token.type === 'Punctuator');
}

/**
 * Determines if a node is surrounded by parentheses.
 */
function isParenthesised(sourceCode: Readonly<SourceCode>, node: Readonly<Rule.Node>): boolean {
    const previousToken = sourceCode.getTokenBefore(node);
    const nextToken = sourceCode.getTokenAfter(node);

    if (node.range === undefined) {
        return false;
    }

    return previousToken !== null && nextToken !== null &&
        previousToken.value === '(' && previousToken.range[1] <= node.range[0] &&
        /* c8 ignore next */
        nextToken.value === ')' && nextToken.range[0] >= node.range[1];
}

/**
 * Checks whether or not a node is callee.
 */
function isCallee(node: Rule.Node): node is CallExpression['callee'] & Rule.NodeParentExtension {
    return node.parent.type === 'CallExpression' && node.parent.callee === node;
}

/**
 * Checks whether or not a given variable is a function name.
 */
function isFunctionName(variable: Scope.Variable | undefined): variable is Scope.Variable {
    return variable !== undefined && variable.defs[0]?.type === 'FunctionName';
}

/**
 * Checks whether or not a given MetaProperty node equals to a given value.
 */
function checkMetaProperty(node: Readonly<MetaProperty>, metaName: string, propertyName: string): boolean {
    return node.meta.name === metaName && node.property.name === propertyName;
}

/**
 * Gets the variable object of `arguments` which is defined implicitly.
 */
function getVariableOfArguments(scope: Readonly<Scope.Scope>): Readonly<Scope.Variable | null> {
    const { variables } = scope;
    let variableObject = null;

    for (const variable of variables) {
        /*
         * If there was a parameter which is named "arguments", the
         * implicit "arguments" is not defined.
         * So does fast return with null.
         */
        if (
            variable.name === 'arguments' &&
            variable.identifiers.length === 0
        ) {
            variableObject = variable;
            break;
        }
    }
    return variableObject;
}

/**
 * Checks whether a simple list of parameters contains any duplicates. This does not handle complex
 * parameter lists (e.g. with destructuring), since complex parameter lists are a SyntaxError with duplicate
 * parameter names anyway. Instead, it always returns `false` for complex parameter lists.
 */
function hasDuplicateParams(paramsList: readonly Pattern[]): boolean {
    return (
        paramsList.every((param) => {
            return param.type === 'Identifier';
        }) &&
        paramsList.length !==
            new Set(paramsList.map((param) => {
                return param.name;
            }))
                .size
    );
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

export const preferArrowCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',

        docs: {
            description: 'Require using arrow functions for callbacks',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/prefer-arrow-callback.md'
        },

        schema: [
            {
                type: 'object',
                properties: {
                    allowNamedFunctions: {
                        type: 'boolean'
                    },
                    allowUnboundThis: {
                        type: 'boolean'
                    }
                },
                additionalProperties: false
            }
        ],

        fixable: 'code',

        messages: {
            preferArrowCallback: 'Unexpected function expression.'
        }
    },

    create(context) {
        const options = isRecord(context.options[0]) ? context.options[0] : {};

        // allowUnboundThis defaults to true
        const allowUnboundThis = options.allowUnboundThis !== false;
        const allowNamedFunctions = typeof options.allowNamedFunctions === 'boolean'
            ? options.allowNamedFunctions
            : false;
        const { sourceCode } = context;

        type CallbackInfo = {
            isCallback: boolean;
            isLexicalThis: boolean;
        };

        /**
         * Checks whether or not a given node is a callback.
         * @param {ASTNode} node A node to check.
         * @throws {Error} (Unreachable.)
         * @returns {Object}
         *   {boolean} returnValue.isCallback - `true` if the node is a callback.
         *   {boolean} returnValue.isLexicalThis - `true` if the node is with `.bind(this)`.
         */
        function getCallbackInfo(node: Readonly<Rule.Node>): Readonly<CallbackInfo> {
            const returnValue = { isCallback: false, isLexicalThis: false };
            let currentNode: Rule.Node | undefined = node;
            let { parent } = node;
            let bound = false;

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- bad typing in eslint core
            while (currentNode !== undefined) {
                // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- we don’t want to handle all cases
                switch (parent.type) {
                    // Checks parents recursively.

                    case 'LogicalExpression':
                    case 'ChainExpression':
                    case 'ConditionalExpression':
                        break;

                        // Checks whether the parent node is `.bind(this)` call.
                    case 'MemberExpression':
                        if (
                            parent.object === currentNode &&
                            !parent.computed &&
                            parent.property.type === 'Identifier' &&
                            parent.property.name === 'bind'
                        ) {
                            const maybeCallee = parent.parent.type === 'ChainExpression'
                                /* c8 ignore next */
                                ? parent.parent
                                : parent;

                            if (isCallee(maybeCallee)) {
                                if (!bound) {
                                    bound = true; // Use only the first `.bind()` to make `isLexicalThis` value.
                                    returnValue.isLexicalThis = isCallExpression(maybeCallee.parent) && maybeCallee
                                                .parent
                                                .arguments
                                                .length === 1 &&
                                        maybeCallee.parent.arguments[0]?.type === 'ThisExpression';
                                }
                                parent = maybeCallee.parent;
                                /* c8 ignore next */
                            } else {
                                /* c8 ignore next */
                                return returnValue;
                                /* c8 ignore next */
                            }
                        } else {
                            return returnValue;
                        }
                        break;

                        // Checks whether the node is a callback.
                    case 'CallExpression':
                    case 'NewExpression':
                        if (parent.callee !== currentNode) {
                            returnValue.isCallback = true;
                        }
                        return returnValue;

                    default:
                        return returnValue;
                }

                currentNode = parent;
                parent = parent.parent;
            }
            /* c8 ignore next */
            throw new Error('unreachable');
        }

        type StackItem = { this: boolean; meta: boolean; };

        /*
         * {Array<{this: boolean, meta: boolean}>}
         * - this - A flag which shows there are one or more ThisExpression.
         * - meta - A flag which shows there are one or more MetaProperty.
         */
        let stack: StackItem[] = [];

        /**
         * Pushes new function scope with all `false` flags.
         * @returns {void}
         */
        function enterScope(): void {
            stack.push({ this: false, meta: false });
        }

        /**
         * Pops a function scope from the stack.
         * @returns {{this: boolean, meta: boolean}} The information of the last scope.
         */
        function exitScope(): Readonly<StackItem | undefined> {
            return stack.pop();
        }

        return createMochaVisitors(context, {
            // Reset internal state.
            Program() {
                stack = [];
            },

            // If there are below, it cannot replace with arrow functions merely.
            ThisExpression() {
                const info = stack.at(-1);

                if (info !== undefined) {
                    info.this = true;
                }
            },

            MetaProperty(node) {
                const info = stack.at(-1);

                if (info !== undefined && checkMetaProperty(node, 'new', 'target')) {
                    info.meta = true;
                }
            },

            // To skip nested scopes.
            FunctionDeclaration: enterScope,
            'FunctionDeclaration:exit': exitScope,

            // Main.
            nonMochaFunctionExpression: enterScope,
            'nonMochaFunctionExpression:exit'(node) {
                const scopeInfo = exitScope();

                // Skip named function expressions
                if (allowNamedFunctions && node.id?.name !== undefined) {
                    return;
                }

                // Skip generators.
                if (node.generator === true) {
                    return;
                }

                // Skip recursive functions.
                const nameVar = sourceCode.getDeclaredVariables(node)[0];

                if (isFunctionName(nameVar) && nameVar.references.length > 0) {
                    return;
                }

                // Skip if it's using arguments.
                const variable = getVariableOfArguments(sourceCode.getScope(node));

                if (variable !== null && variable.references.length > 0) {
                    return;
                }

                // Reports if it's a callback which can replace with arrows.
                const callbackInfo = getCallbackInfo(node);

                if (
                    callbackInfo.isCallback &&
                    (!allowUnboundThis || scopeInfo?.this !== true || callbackInfo.isLexicalThis) &&
                    scopeInfo?.meta !== true
                ) {
                    context.report({
                        node,
                        messageId: 'preferArrowCallback',
                        *fix(fixer) {
                            if (
                                (!callbackInfo.isLexicalThis && scopeInfo?.this === true) ||
                                hasDuplicateParams(node.params)
                            ) {
                                /*
                                 * If the callback function does not have .bind(this) and contains a reference to `this`, there
                                 * is no way to determine what `this` should be, so don't perform any fixes.
                                 * If the callback function has duplicates in its list of parameters (possible in sloppy mode),
                                 * don't replace it with an arrow function, because this is a SyntaxError with arrow functions.
                                 */
                                return;
                            }

                            // Remove `.bind(this)` if exists.
                            if (callbackInfo.isLexicalThis) {
                                const memberNode = node.parent;

                                /*
                                 * If `.bind(this)` exists but the parent is not `.bind(this)`, don't remove it automatically.
                                 * E.g. `(foo || function(){}).bind(this)`
                                 */
                                /* c8 ignore next */
                                if (memberNode.type !== 'MemberExpression') {
                                    /* c8 ignore next */
                                    return;
                                    /* c8 ignore next */
                                }

                                const callNode = memberNode.parent;
                                const firstTokenToRemove = sourceCode.getTokenAfter(
                                    memberNode.object,
                                    isNotClosingParenToken
                                );
                                const lastTokenToRemove = sourceCode.getLastToken(callNode);

                                /*
                                 * If the member expression is parenthesized, don't remove the right paren.
                                 * E.g. `(function(){}.bind)(this)`
                                 *                    ^^^^^^^^^^^^
                                 */
                                /* c8 ignore next */
                                if (isParenthesised(sourceCode, memberNode)) {
                                    /* c8 ignore next */
                                    return;
                                    /* c8 ignore next */
                                }

                                if (firstTokenToRemove === null || lastTokenToRemove === null) {
                                    return;
                                }

                                // If comments exist in the `.bind(this)`, don't remove those.
                                /* c8 ignore next */
                                if (sourceCode.commentsExistBetween(firstTokenToRemove, lastTokenToRemove)) {
                                    /* c8 ignore next */
                                    return;
                                    /* c8 ignore next */
                                }

                                yield fixer.removeRange([firstTokenToRemove.range[0], lastTokenToRemove.range[1]]);
                            }

                            // Convert the function expression to an arrow function.
                            const functionToken = sourceCode.getFirstToken(node, node.async === true ? 1 : 0);
                            if (functionToken === null) {
                                return;
                            }

                            const leftParenToken = sourceCode.getTokenAfter(
                                functionToken,
                                isOpeningParenToken
                            );
                            const tokenBeforeBody = sourceCode.getTokenBefore(node.body);

                            if (leftParenToken === null || tokenBeforeBody === null) {
                                return;
                            }

                            /* c8 ignore next */
                            if (sourceCode.commentsExistBetween(functionToken, leftParenToken)) {
                                /* c8 ignore next */
                                // Remove only extra tokens to keep comments.
                                /* c8 ignore next */
                                yield fixer.remove(functionToken);
                                /* c8 ignore next */
                                if (node.id !== undefined && node.id !== null) {
                                    /* c8 ignore next */
                                    yield fixer.remove(node.id);
                                    /* c8 ignore next */
                                }
                            } else {
                                // Remove extra tokens and spaces.
                                yield fixer.removeRange([functionToken.range[0], leftParenToken.range[0]]);
                            }
                            yield fixer.insertTextAfter(tokenBeforeBody, ' =>');

                            // Get the node that will become the new arrow function.
                            let replacedNode = callbackInfo.isLexicalThis ? node.parent.parent : node;

                            /* c8 ignore next */
                            if (replacedNode.type === 'ChainExpression') {
                                /* c8 ignore next */
                                replacedNode = replacedNode.parent;
                                /* c8 ignore next */
                            }

                            /*
                             * If the replaced node is part of a BinaryExpression, LogicalExpression, or MemberExpression, then
                             * the arrow function needs to be parenthesized, because `foo || () => {}` is invalid syntax even
                             * though `foo || function() {}` is valid.
                             */
                            if (
                                replacedNode.parent.type !== 'CallExpression' &&
                                replacedNode.parent.type !== 'ConditionalExpression' &&
                                !isParenthesised(sourceCode, replacedNode) &&
                                !isParenthesised(sourceCode, node)
                            ) {
                                yield fixer.insertTextBefore(replacedNode, '(');
                                yield fixer.insertTextAfter(replacedNode, ')');
                            }
                        }
                    });
                }
            }
        });
    }
};
