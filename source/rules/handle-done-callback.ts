import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { isFunction, isIdentifier } from '../ast/node-types.js';
import type { AnyFunction } from '../ast/node-types.js';
import {
    asRuleNode,
    asRuleNodeOrNull,
    getMemberExpressionBindingAndProperty,
    getTrackedBinding,
    hasUnhandledReturnPath,
    type Operation,
    type TrackedBinding
} from '../done-callback-paths.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
    type: 'object',
    properties: {
        ignorePending: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { ignorePending: boolean; };
const defaultOption: ResolvedOption = { ignorePending: false };

type TrackedFunctionState = {
    callback: Rule.Node;
    callbackBinding: TrackedBinding;
    callbackName: string;
    codePath: Readonly<Rule.CodePath>;
    currentSegments: Set<Rule.CodePathSegment>;
    operationsBySegmentId: Map<string, Operation[]>;
};

type FunctionState = {
    tracked: TrackedFunctionState | undefined;
    upper: FunctionState | null;
};

export function findParamInScope(
    paramName: string,
    scope: Readonly<Scope.Scope>
): Readonly<Scope.Variable | undefined> {
    const variable = scope.set.get(paramName);

    return variable?.defs[0]?.type === 'Parameter' ? variable : undefined;
}

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
    operationsBySegmentId: Map<string, Operation[]>,
    segmentId: string,
    operation: Readonly<Operation>
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
        callback: asRuleNode(callback),
        callbackBinding: getTrackedBinding(sourceCode, callback),
        callbackName: callback.name,
        codePath,
        currentSegments: new Set(),
        operationsBySegmentId: new Map()
    };
}

function reportUnhandledDoneCallback(
    context: Readonly<Rule.RuleContext>,
    trackedFunction: Readonly<TrackedFunctionState>
): void {
    const hasUnhandledPath = hasUnhandledReturnPath({
        callbackBinding: trackedFunction.callbackBinding,
        codePath: trackedFunction.codePath,
        operationsBySegmentId: trackedFunction.operationsBySegmentId,
        sourceCode: context.sourceCode
    });

    if (!hasUnhandledPath) {
        return;
    }

    context.report({
        node: trackedFunction.callback,
        messageId: 'expectedCallback',
        data: { name: trackedFunction.callbackName }
    });
}

export const handleDoneCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        languages: ['js/js'],
        docs: {
            description: 'Enforces handling of callbacks for async tests in every branch',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/handle-done-callback.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            expectedCallback: 'Expected "{{name}}" callback to be handled.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { ignorePending } = getRuleOption<ResolvedOption>(context);
        const trackedCallbackNodes = new WeakSet<Rule.Node>();
        let currentFunction: FunctionState | null = null;

        function recordOperation(operation: Readonly<Operation>): void {
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
                if (visitorContext.modifier === 'pending' && ignorePending) {
                    return;
                }

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
                    reportUnhandledDoneCallback(context, trackedFunction);
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
                    source: asRuleNodeOrNull(node.init),
                    target: getTrackedBinding(context.sourceCode, node.id),
                    type: 'bindingAssignment'
                });
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

                if (node.left.type !== 'MemberExpression') {
                    return;
                }

                const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.left);

                if (bindingAndProperty === undefined) {
                    return;
                }

                recordOperation({
                    propertyName: bindingAndProperty.propertyName,
                    source: asRuleNode(node.right),
                    target: bindingAndProperty.binding,
                    type: 'containerPropertyAssignment'
                });
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

                if (node.argument.type !== 'MemberExpression') {
                    return;
                }

                const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.argument);

                if (bindingAndProperty === undefined) {
                    return;
                }

                recordOperation({
                    propertyName: bindingAndProperty.propertyName,
                    source: null,
                    target: bindingAndProperty.binding,
                    type: 'containerPropertyAssignment'
                });
            },

            'UnaryExpression:exit'(node) {
                if (node.operator !== 'delete' || node.argument.type !== 'MemberExpression') {
                    return;
                }

                const bindingAndProperty = getMemberExpressionBindingAndProperty(context.sourceCode, node.argument);

                if (bindingAndProperty === undefined) {
                    return;
                }

                recordOperation({
                    propertyName: bindingAndProperty.propertyName,
                    source: null,
                    target: bindingAndProperty.binding,
                    type: 'containerPropertyAssignment'
                });
            }
        });
    }
};
