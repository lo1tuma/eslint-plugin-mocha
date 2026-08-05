import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { isFunction } from '../ast/node-types.ts';
import { asRuleNode } from '../ast/rule-node.ts';
import type { CallbackHandlingOperation } from '../callback-handling-state.ts';
import { hasUnhandledReturnPath } from '../done-callback-paths.ts';
import { getIdentifierCallbackParameter } from '../mocha/callback-parameter.ts';
import {
    getMemberExpressionBindingAndProperty,
    getTrackedBinding,
    type TrackedBinding
} from '../tracked-callback-reference-state.ts';

type TrackedCallbackFunctionBase = {
    readonly callbackBinding: TrackedBinding;
    readonly codePath: Readonly<Rule.CodePath>;
    readonly currentSegments: ReadonlySet<Rule.CodePathSegment>;
    readonly operationsBySegmentId: ReadonlyMap<string, readonly CallbackHandlingOperation[]>;
};
export type DirectTrackedCallbackFunction = TrackedCallbackFunctionBase & {
    readonly callbackName: string;
    readonly callbackNode: Rule.Node;
};
type InheritedTrackedCallbackFunction = TrackedCallbackFunctionBase & {
    readonly callbackName: undefined;
    readonly callbackNode: undefined;
};
export type TrackedCallbackFunction = DirectTrackedCallbackFunction | InheritedTrackedCallbackFunction;

type SharedCallbackTrackingOptions = {
    readonly ignorePending: boolean;
    readonly trackHandledCallbackArguments: boolean;
};
type CallbackTrackingOptions =
    | SharedCallbackTrackingOptions & {
        readonly includeInheritedCallbackBinding: false;
        readonly onTrackedFunctionEnd: (trackedFunction: Readonly<DirectTrackedCallbackFunction>) => void;
    }
    | SharedCallbackTrackingOptions & {
        readonly includeInheritedCallbackBinding: true;
        readonly onTrackedFunctionEnd: (
            trackedFunction: Readonly<DirectTrackedCallbackFunction | InheritedTrackedCallbackFunction>
        ) => void;
    };
type TrackedCallbackFunctionContext = {
    readonly codePath: Readonly<Rule.CodePath>;
    readonly includeInheritedCallbackBinding: boolean;
    readonly inheritedCallbackBinding: TrackedBinding | undefined;
    readonly node: Readonly<Rule.Node>;
    readonly sourceCode: Readonly<Rule.RuleContext['sourceCode']>;
    readonly trackedCallbackNodes: Readonly<WeakSet<Rule.Node>>;
};
type FunctionState = {
    readonly node: Readonly<Rule.Node>;
    readonly tracked: TrackedCallbackFunction | undefined;
    readonly upper: FunctionState | null;
};

function pushOperation(
    operationsBySegmentId: ReadonlyMap<string, readonly CallbackHandlingOperation[]>,
    segmentId: string,
    operation: Readonly<CallbackHandlingOperation>
): ReadonlyMap<string, readonly CallbackHandlingOperation[]> {
    const operations = operationsBySegmentId.get(segmentId);

    if (operations === undefined) {
        return new Map([
            ...operationsBySegmentId,
            [ segmentId, [ operation ] ]
        ]);
    }

    return new Map([
        ...operationsBySegmentId,
        [ segmentId, [ ...operations, operation ] ]
    ]);
}

function createTrackedCallbackFunction(
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

function isDirectTrackedCallbackFunction(
    trackedFunction: Readonly<TrackedCallbackFunction>
): trackedFunction is Readonly<DirectTrackedCallbackFunction> {
    return trackedFunction.callbackName !== undefined;
}

function isInheritedTrackedCallbackFunction(
    trackedFunction: Readonly<TrackedCallbackFunction>
): trackedFunction is Readonly<InheritedTrackedCallbackFunction> {
    return trackedFunction.callbackName === undefined;
}

function reportTrackedFunction(
    callbackTrackingOptions: Readonly<CallbackTrackingOptions>,
    trackedFunction: Readonly<TrackedCallbackFunction>
): void {
    if (callbackTrackingOptions.includeInheritedCallbackBinding) {
        const { onTrackedFunctionEnd } = callbackTrackingOptions;

        onTrackedFunctionEnd(trackedFunction);
        return;
    }

    if (isDirectTrackedCallbackFunction(trackedFunction)) {
        const { onTrackedFunctionEnd } = callbackTrackingOptions;

        onTrackedFunctionEnd(trackedFunction);
    }
}

function isHandledCallbackObjectArgument(
    node: Readonly<Rule.Node>,
    handledCallbackNodes: Readonly<WeakSet<Rule.Node>>
): boolean {
    return node.type === 'ObjectExpression' && node.properties.some(function (property) {
        return property.type === 'Property' && handledCallbackNodes.has(asRuleNode(property.value));
    });
}

function isOrContainsHandledCallback(
    node: Readonly<Rule.Node>,
    handledCallbackNodes: Readonly<WeakSet<Rule.Node>>
): boolean {
    if (handledCallbackNodes.has(asRuleNode(node))) {
        return true;
    }
    return isHandledCallbackObjectArgument(node, handledCallbackNodes);
}

export function createTrackedCallbackVisitors(
    context: Readonly<Rule.RuleContext>,
    callbackTrackingOptions: Readonly<CallbackTrackingOptions>
): Readonly<Rule.RuleListener> {
    const trackedCallbackNodes = new WeakSet<Rule.Node>();
    const handledCallbackNodes = new WeakSet<Rule.Node>();
    let currentFunction: FunctionState | null = null;

    function recordOperation(operation: Readonly<CallbackHandlingOperation>): void {
        const trackedFunction = currentFunction?.tracked;

        if (trackedFunction === undefined) {
            return;
        }

        const { operationsBySegmentId: initialOperationsBySegmentId } = trackedFunction;
        let operationsBySegmentId = initialOperationsBySegmentId;

        for (const segment of trackedFunction.currentSegments) {
            operationsBySegmentId = pushOperation(operationsBySegmentId, segment.id, operation);
        }

        if (currentFunction !== null) {
            currentFunction = {
                node: currentFunction.node,
                tracked: {
                    ...trackedFunction,
                    operationsBySegmentId
                },
                upper: currentFunction.upper
            };
        }
    }

    function updateCurrentTrackedFunction(
        updateTrackedFunction: (trackedFunction: Readonly<TrackedCallbackFunction>) => TrackedCallbackFunction
    ): void {
        const trackedFunction = currentFunction?.tracked;

        if (currentFunction !== null && trackedFunction !== undefined) {
            currentFunction = {
                ...currentFunction,
                tracked: updateTrackedFunction(trackedFunction)
            };
        }
    }

    function trackMochaCallback(node: Readonly<Rule.Node>): void {
        trackedCallbackNodes.add(node);
    }

    function trackHandledCallbackNode(
        node: Readonly<Rule.Node>,
        trackedFunction: Readonly<TrackedCallbackFunction>
    ): void {
        if (
            callbackTrackingOptions.trackHandledCallbackArguments &&
            isInheritedTrackedCallbackFunction(trackedFunction) &&
            !hasUnhandledReturnPath({
                callbackBinding: trackedFunction.callbackBinding,
                codePath: trackedFunction.codePath,
                operationsBySegmentId: trackedFunction.operationsBySegmentId,
                sourceCode: context.sourceCode
            })
        ) {
            handledCallbackNodes.add(asRuleNode(node));
        }
    }

    function hasHandledCallbackArgument(
        node: Readonly<Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0]>
    ): boolean {
        return node.arguments.some(function (argument) {
            const candidate = argument.type === 'SpreadElement' ? argument.argument : argument;

            return isOrContainsHandledCallback(asRuleNode(candidate), handledCallbackNodes);
        });
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
                node,
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
            const endedFunction = currentFunction;
            const trackedFunction = currentFunction?.tracked;

            if (trackedFunction !== undefined) {
                if (endedFunction !== null) {
                    trackHandledCallbackNode(endedFunction.node, trackedFunction);
                }

                reportTrackedFunction(callbackTrackingOptions, trackedFunction);
            }

            currentFunction = currentFunction?.upper ?? null;
        },

        onCodePathSegmentStart(segment) {
            updateCurrentTrackedFunction(function (trackedFunction) {
                return {
                    ...trackedFunction,
                    currentSegments: new Set([ ...trackedFunction.currentSegments, segment ])
                };
            });
        },

        onCodePathSegmentEnd(segment) {
            updateCurrentTrackedFunction(function (trackedFunction) {
                return {
                    ...trackedFunction,
                    currentSegments: new Set(
                        Array.from(trackedFunction.currentSegments).filter(function (currentSegment) {
                            return currentSegment !== segment;
                        })
                    )
                };
            });
        },

        'CallExpression:exit'(node) {
            if (callbackTrackingOptions.trackHandledCallbackArguments && hasHandledCallbackArgument(node)) {
                recordOperation({ node, type: 'callbackHandoff' });
            }

            recordOperation({ node, type: 'call' });
        },

        'VariableDeclarator:exit'(node) {
            if (
                callbackTrackingOptions.trackHandledCallbackArguments &&
                node.init !== null &&
                isOrContainsHandledCallback(asRuleNode(node.init), handledCallbackNodes)
            ) {
                recordOperation({ node, type: 'callbackHandoff' });
            }

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
            if (
                callbackTrackingOptions.trackHandledCallbackArguments &&
                isOrContainsHandledCallback(asRuleNode(node.right), handledCallbackNodes)
            ) {
                recordOperation({ node, type: 'callbackHandoff' });
            }

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
