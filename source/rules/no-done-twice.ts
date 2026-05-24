import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type AnyFunction, isFunction, isIdentifier } from '../ast/node-types.js';
import type { CallbackHandlingOperation } from '../callback-handling-state.js';
import {
    asRuleNode,
    asRuleNodeOrNull,
    getMemberExpressionBindingAndProperty,
    getTrackedBinding,
    type TrackedBinding
} from '../done-callback-paths.js';
import { collectRepeatedCallbackHandlingNodes } from '../repeated-callback-handling-paths.js';

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

function createTrackedFunctionState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    trackedCallbackNodes: Readonly<WeakSet<Rule.Node>>,
    codePath: Readonly<Rule.CodePath>,
    node: Readonly<Rule.Node>
): TrackedFunctionState | undefined {
    if (!trackedCallbackNodes.has(node) || !isFunction(node)) {
        return undefined;
    }

    const callback = getDoneCallback(node);

    if (callback === undefined || callback.type !== 'Identifier') {
        return undefined;
    }

    return {
        callbackBinding: getTrackedBinding(sourceCode, callback),
        codePath,
        currentSegments: new Set(),
        operationsBySegmentId: new Map()
    };
}

function reportDoneTwice(context: Readonly<Rule.RuleContext>, trackedFunction: Readonly<TrackedFunctionState>): void {
    const reportedNodes = collectRepeatedCallbackHandlingNodes({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    for (const node of reportedNodes) {
        context.report({
            node,
            messageId: 'unexpectedDoneTwice'
        });
    }
}

export const noDoneTwiceRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Disallow calling a Mocha callback more than once',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-done-twice.md'
        },
        messages: {
            unexpectedDoneTwice: 'Do not call the Mocha callback more than once'
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
                    tracked: createTrackedFunctionState(context.sourceCode, trackedCallbackNodes, codePath, node),
                    upper: currentFunction
                };
            },

            onCodePathEnd() {
                const trackedFunction = currentFunction?.tracked;

                if (trackedFunction !== undefined) {
                    reportDoneTwice(context, trackedFunction);
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
                        source: asRuleNodeOrNull(node.init),
                        target: getTrackedBinding(context.sourceCode, node.id),
                        type: 'bindingAssignment'
                    });
                }
            },

            'AssignmentExpression:exit'(node) {
                if (node.left.type === 'Identifier') {
                    recordOperation({
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
