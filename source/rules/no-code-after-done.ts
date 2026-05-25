import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction, isIdentifier } from '../ast/node-types.js';
import { collectCodeAfterCallbackHandlingNodes } from '../callback-handling-paths.js';
import type { CallbackHandlingOperation } from '../callback-handling-state.js';
import {
    asRuleNode,
    asRuleNodeOrNull,
    getMemberExpressionBindingAndProperty,
    getTrackedBinding,
    type TrackedBinding
} from '../done-callback-paths.js';

type TrackedFunctionState = {
    callbackBinding: TrackedBinding;
    codePath: Readonly<Rule.CodePath>;
    currentSegments: Set<Rule.CodePathSegment>;
    operationsBySegmentId: Map<string, CallbackHandlingOperation[]>;
};

type FunctionState = {
    tracked: TrackedFunctionState | undefined;
    upper: FunctionState | null;
};
type TrackedFunctionStateContext = {
    codePath: Readonly<Rule.CodePath>;
    inheritedCallbackBinding: TrackedBinding | undefined;
    node: Readonly<Rule.Node>;
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>;
    trackedCallbackNodes: Readonly<WeakSet<Rule.Node>>;
};

function isTypeScriptThisParameter(param: AnyFunction['params'][number]): boolean {
    return isIdentifier(param) && param.name === 'this';
}

function getDoneCallback(
    functionExpression: Readonly<AnyFunction>
): AnyFunction['params'][number] | undefined {
    const [firstParam, secondParam] = functionExpression.params;

    if (firstParam === undefined) {
        return undefined;
    }

    return isTypeScriptThisParameter(firstParam) ? secondParam : firstParam;
}

function pushOperation(
    operationsBySegmentId: Map<string, CallbackHandlingOperation[]>,
    segmentId: string,
    operation: Readonly<CallbackHandlingOperation>
): void {
    const operations = operationsBySegmentId.get(segmentId);

    if (operations === undefined) {
        operationsBySegmentId.set(segmentId, [operation]);
        return;
    }

    operations.push(operation);
}

function createTrackedState(
    callbackBinding: TrackedBinding,
    codePath: Readonly<Rule.CodePath>
): TrackedFunctionState {
    return {
        callbackBinding,
        codePath,
        currentSegments: new Set(),
        operationsBySegmentId: new Map()
    };
}

function getTrackedMochaCallbackBinding(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    trackedCallbackNodes: Readonly<WeakSet<Rule.Node>>,
    node: Readonly<Rule.Node>
): TrackedBinding | undefined {
    if (!trackedCallbackNodes.has(node) || !isFunction(node)) {
        return undefined;
    }

    const callback = getDoneCallback(node);

    if (callback === undefined || callback.type !== 'Identifier') {
        return undefined;
    }

    return getTrackedBinding(sourceCode, callback);
}

function createTrackedFunctionState(
    trackedFunctionStateContext: Readonly<TrackedFunctionStateContext>
): TrackedFunctionState | undefined {
    const {
        sourceCode,
        trackedCallbackNodes,
        inheritedCallbackBinding,
        codePath,
        node
    } = trackedFunctionStateContext;

    if (!isFunction(node)) {
        return undefined;
    }

    const trackedMochaCallbackBinding = getTrackedMochaCallbackBinding(sourceCode, trackedCallbackNodes, node);

    if (trackedMochaCallbackBinding !== undefined) {
        return createTrackedState(trackedMochaCallbackBinding, codePath);
    }

    if (inheritedCallbackBinding === undefined) {
        return undefined;
    }

    return createTrackedState(inheritedCallbackBinding, codePath);
}

function reportCodeAfterDone(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<TrackedFunctionState>
): void {
    const reportedNodes = collectCodeAfterCallbackHandlingNodes({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    for (const node of reportedNodes) {
        context.report({
            node,
            messageId: 'unexpectedCodeAfterDone'
        });
    }
}

export const noCodeAfterDoneRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow executing code after calling a Mocha callback',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-code-after-done.md'
        },
        messages: {
            unexpectedCodeAfterDone: 'Do not execute code after calling the Mocha callback'
        },
        schema: []
    },
    create(context) {
        const trackedCallbackNodes = new WeakSet<Rule.Node>();
        let currentFunction: FunctionState | null = null;

        function recordOperation(operation: Readonly<CallbackHandlingOperation>): void {
            const trackedFunction = currentFunction?.tracked;

            if (trackedFunction === undefined) {
                return;
            }

            for (const segment of trackedFunction.currentSegments) {
                pushOperation(trackedFunction.operationsBySegmentId, segment.id, operation);
            }
        }

        function trackMochaCallback(node: Readonly<Rule.Node>): void {
            trackedCallbackNodes.add(node);
        }

        return createMochaVisitors(context, {
            testCaseCallback(visitorContext) {
                trackMochaCallback(visitorContext.node);
            },

            hookCallback(visitorContext) {
                trackMochaCallback(visitorContext.node);
            },

            onCodePathStart(codePath, node) {
                currentFunction = {
                    tracked: createTrackedFunctionState({
                        sourceCode: context.sourceCode,
                        trackedCallbackNodes,
                        inheritedCallbackBinding: currentFunction?.tracked?.callbackBinding,
                        codePath,
                        node
                    }),
                    upper: currentFunction
                };
            },

            onCodePathEnd() {
                const trackedFunction = currentFunction?.tracked;

                if (trackedFunction !== undefined) {
                    reportCodeAfterDone(context, trackedFunction);
                }

                currentFunction = currentFunction?.upper ?? null;
            },

            onCodePathSegmentStart(segment) {
                currentFunction?.tracked?.currentSegments.add(segment);
            },

            onCodePathSegmentEnd(segment) {
                currentFunction?.tracked?.currentSegments.delete(segment);
            },

            'CallExpression:exit'(node) {
                recordOperation({ node, type: 'call' });
            },

            'VariableDeclarator:exit'(node) {
                if (node.id.type === 'Identifier') {
                    recordOperation({
                        node,
                        source: asRuleNodeOrNull(node.init),
                        target: getTrackedBinding(context.sourceCode, node.id),
                        type: 'bindingAssignment'
                    });
                }
            },

            'AssignmentExpression:exit'(node) {
                if (node.left.type === 'Identifier') {
                    recordOperation({
                        node,
                        source: asRuleNode(node.right),
                        target: getTrackedBinding(context.sourceCode, node.left),
                        type: 'bindingAssignment'
                    });
                    return;
                }

                if (node.left.type === 'MemberExpression') {
                    const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.left);

                    if (bindingAndProperty !== undefined) {
                        recordOperation({
                            node,
                            propertyName: bindingAndProperty.propertyName,
                            source: asRuleNode(node.right),
                            target: bindingAndProperty.binding,
                            type: 'containerPropertyAssignment'
                        });
                    }
                }
            },

            'UpdateExpression:exit'(node) {
                if (node.argument.type === 'Identifier') {
                    recordOperation({
                        node,
                        source: null,
                        target: getTrackedBinding(context.sourceCode, node.argument),
                        type: 'bindingAssignment'
                    });
                    return;
                }

                if (node.argument.type === 'MemberExpression') {
                    const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.argument);

                    if (bindingAndProperty !== undefined) {
                        recordOperation({
                            node,
                            propertyName: bindingAndProperty.propertyName,
                            source: null,
                            target: bindingAndProperty.binding,
                            type: 'containerPropertyAssignment'
                        });
                    }
                }
            },

            'UnaryExpression:exit'(node) {
                if (node.operator === 'delete' && node.argument.type === 'MemberExpression') {
                    const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.argument);

                    if (bindingAndProperty !== undefined) {
                        recordOperation({
                            node,
                            propertyName: bindingAndProperty.propertyName,
                            source: null,
                            target: bindingAndProperty.binding,
                            type: 'containerPropertyAssignment'
                        });
                    }
                }
            }
        });
    }
};
