import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isFunction } from '../ast/node-types.js';
import type { CallbackHandlingOperation } from '../callback-handling-state.js';
import {
    asRuleNode,
    getMemberExpressionBindingAndProperty,
    getTrackedBinding,
    type TrackedBinding
} from '../done-callback-paths.js';
import { getIdentifierCallbackParameter } from '../mocha/callback-parameter.js';

export type TrackedCallbackFunction = {
    callbackBinding: TrackedBinding;
    callbackName: string | undefined;
    callbackNode: Rule.Node | undefined;
    codePath: Readonly<Rule.CodePath>;
    currentSegments: Set<Rule.CodePathSegment>;
    operationsBySegmentId: Map<string, CallbackHandlingOperation[]>;
};

type CallbackTrackingOptions = {
    ignorePending: boolean;
    includeInheritedCallbackBinding: boolean;
    onTrackedFunctionEnd: (trackedFunction: Readonly<TrackedCallbackFunction>) => void;
};
type TrackedCallbackFunctionContext = {
    codePath: Readonly<Rule.CodePath>;
    includeInheritedCallbackBinding: boolean;
    inheritedCallbackBinding: TrackedBinding | undefined;
    node: Readonly<Rule.Node>;
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>;
    trackedCallbackNodes: Readonly<WeakSet<Rule.Node>>;
};
type FunctionState = {
    tracked: TrackedCallbackFunction | undefined;
    upper: FunctionState | null;
};

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

export function createTrackedCallbackFunction(
    trackedCallbackFunctionContext: Readonly<TrackedCallbackFunctionContext>
): TrackedCallbackFunction | undefined {
    const {
        sourceCode,
        trackedCallbackNodes,
        inheritedCallbackBinding,
        includeInheritedCallbackBinding,
        codePath,
        node
    } = trackedCallbackFunctionContext;

    if (!isFunction(node)) {
        return undefined;
    }

    const callbackParameter = trackedCallbackNodes.has(node) ? getIdentifierCallbackParameter(node) : undefined;

    if (callbackParameter !== undefined) {
        return {
            callbackBinding: getTrackedBinding(sourceCode, callbackParameter),
            callbackName: callbackParameter.name,
            callbackNode: asRuleNode(callbackParameter),
            codePath,
            currentSegments: new Set(),
            operationsBySegmentId: new Map()
        };
    }

    if (!includeInheritedCallbackBinding || inheritedCallbackBinding === undefined) {
        return undefined;
    }

    return {
        callbackBinding: inheritedCallbackBinding,
        callbackName: undefined,
        callbackNode: undefined,
        codePath,
        currentSegments: new Set(),
        operationsBySegmentId: new Map()
    };
}

function recordMemberPropertyAssignment(
    context: Readonly<Rule.RuleContext>,
    recordOperation: (operation: Readonly<CallbackHandlingOperation>) => void,
    node: Readonly<Rule.Node>,
    memberExpression: Parameters<typeof getMemberExpressionBindingAndProperty>[1]
): void {
    const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, memberExpression);

    if (bindingAndProperty === undefined) {
        return;
    }

    recordOperation({
        node,
        propertyName: bindingAndProperty.propertyName,
        source: null,
        target: bindingAndProperty.binding,
        type: 'containerPropertyAssignment'
    });
}

export function createTrackedCallbackVisitors(
    context: Readonly<Rule.RuleContext>,
    callbackTrackingOptions: Readonly<CallbackTrackingOptions>
): Readonly<Rule.RuleListener> {
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
            if (visitorContext.modifier === 'pending' && callbackTrackingOptions.ignorePending) {
                return;
            }

            trackMochaCallback(visitorContext.node);
        },

        hookCallback(visitorContext) {
            trackMochaCallback(visitorContext.node);
        },

        onCodePathStart(codePath, node) {
            currentFunction = {
                tracked: createTrackedCallbackFunction({
                    sourceCode: context.sourceCode,
                    trackedCallbackNodes,
                    inheritedCallbackBinding: currentFunction?.tracked?.callbackBinding,
                    includeInheritedCallbackBinding: callbackTrackingOptions.includeInheritedCallbackBinding,
                    codePath,
                    node
                }),
                upper: currentFunction
            };
        },

        onCodePathEnd() {
            const trackedFunction = currentFunction?.tracked;

            if (trackedFunction !== undefined) {
                callbackTrackingOptions.onTrackedFunctionEnd(trackedFunction);
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
            if (node.id.type !== 'Identifier') {
                return;
            }

            recordOperation({
                node,
                source: node.init === null ? null : asRuleNode(node.init),
                target: getTrackedBinding(context.sourceCode, node.id),
                type: 'bindingAssignment'
            });
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

            if (node.left.type !== 'MemberExpression') {
                return;
            }

            const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.left);

            if (bindingAndProperty === undefined) {
                return;
            }

            recordOperation({
                node,
                propertyName: bindingAndProperty.propertyName,
                source: asRuleNode(node.right),
                target: bindingAndProperty.binding,
                type: 'containerPropertyAssignment'
            });
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

            if (node.argument.type !== 'MemberExpression') {
                return;
            }

            recordMemberPropertyAssignment(context, recordOperation, node, node.argument);
        },

        'UnaryExpression:exit'(node) {
            if (node.operator !== 'delete' || node.argument.type !== 'MemberExpression') {
                return;
            }

            recordMemberPropertyAssignment(context, recordOperation, node, node.argument);
        }
    });
}
