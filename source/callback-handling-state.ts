import type { Rule } from 'eslint';
import { extractMemberExpressionPath, isConstantPath } from './ast/member-expression.js';
import {
    asRuleNode,
    cloneTrackedContainerProperties,
    collectTrackedCallbackObjectProperties,
    getTrackedBinding,
    haveSameTrackedBindings,
    haveSameTrackedContainerProperties,
    isTrackedCallbackExpression,
    type TrackedBinding
} from './done-callback-paths.js';
import { stripCallExpressions } from './mocha/name-details.js';

const dynamicPropertyName = '<dynamic>';
const knownSingleCallbackDelegates = new Set(
    ('setImmediate setTimeout queueMicrotask process.nextTick ' +
        'global.setImmediate global.setTimeout global.queueMicrotask ' +
        'globalThis.setImmediate globalThis.setTimeout globalThis.queueMicrotask ' +
        'window.queueMicrotask')
        .split(' ')
);

type CallExpressionNode = Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0];
type CallbackReferenceState = {
    aliasBindings: Set<TrackedBinding>;
    containerPropertiesByBinding: Map<TrackedBinding, Set<string>>;
};
export type CallbackPathState = {
    callbackHandled: boolean;
    handledReferences: CallbackReferenceState;
    unhandledReferences: CallbackReferenceState;
};

export type CallbackHandlingOperation =
    | {
        node: CallExpressionNode;
        type: 'call';
    }
    | {
        node: Rule.Node;
        propertyName: string | undefined;
        source: Readonly<Rule.Node> | null;
        target: TrackedBinding;
        type: 'containerPropertyAssignment';
    }
    | {
        node: Rule.Node;
        source: Readonly<Rule.Node> | null;
        target: TrackedBinding;
        type: 'bindingAssignment';
    };

export type CallbackHandlingContext = {
    callbackBinding: TrackedBinding;
    codePath: Readonly<Rule.CodePath>;
    operationsBySegmentId: ReadonlyMap<string, readonly CallbackHandlingOperation[]>;
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>;
};

function createEmptyReferenceState(): CallbackReferenceState {
    return { aliasBindings: new Set(), containerPropertiesByBinding: new Map() };
}

function createInitialPathState(callbackBinding: TrackedBinding): CallbackPathState {
    return {
        callbackHandled: false,
        handledReferences: createEmptyReferenceState(),
        unhandledReferences: {
            aliasBindings: new Set([callbackBinding]),
            containerPropertiesByBinding: new Map()
        }
    };
}

function cloneReferenceState(state: Readonly<CallbackReferenceState>): CallbackReferenceState {
    return {
        aliasBindings: new Set(state.aliasBindings),
        containerPropertiesByBinding: cloneTrackedContainerProperties(state.containerPropertiesByBinding)
    };
}

export function clonePathState(state: Readonly<CallbackPathState>): CallbackPathState {
    return {
        callbackHandled: state.callbackHandled,
        handledReferences: cloneReferenceState(state.handledReferences),
        unhandledReferences: cloneReferenceState(state.unhandledReferences)
    };
}

function areReferenceStatesSame(
    left: Readonly<CallbackReferenceState>,
    right: Readonly<CallbackReferenceState>
): boolean {
    return haveSameTrackedBindings(left.aliasBindings, right.aliasBindings) &&
        haveSameTrackedContainerProperties(
            left.containerPropertiesByBinding,
            right.containerPropertiesByBinding
        );
}

export function arePathStatesSame(
    left: Readonly<CallbackPathState> | undefined,
    right: Readonly<CallbackPathState>
): boolean {
    return left !== undefined &&
        left.callbackHandled === right.callbackHandled &&
        areReferenceStatesSame(left.handledReferences, right.handledReferences) &&
        areReferenceStatesSame(left.unhandledReferences, right.unhandledReferences);
}

function getContainerPropertiesFromExpression(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    node: Readonly<Rule.Node>,
    state: Readonly<CallbackReferenceState>
): Set<string> | undefined {
    if (node.type === 'Identifier') {
        const trackedProperties = state.containerPropertiesByBinding.get(getTrackedBinding(sourceCode, node));

        return trackedProperties === undefined ? undefined : new Set(trackedProperties);
    }

    if (node.type !== 'ObjectExpression') {
        return undefined;
    }

    const trackedProperties = collectTrackedCallbackObjectProperties(sourceCode, node, state);
    return trackedProperties.size > 0 ? trackedProperties : undefined;
}

function clearBindingReferenceState(
    state: Readonly<CallbackReferenceState>,
    target: TrackedBinding
): CallbackReferenceState {
    const nextState = cloneReferenceState(state);

    nextState.aliasBindings.delete(target);
    nextState.containerPropertiesByBinding.delete(target);

    return nextState;
}

function addAliasBindingReferenceState(
    state: Readonly<CallbackReferenceState>,
    target: TrackedBinding
): CallbackReferenceState {
    const nextState = cloneReferenceState(state);

    nextState.aliasBindings.add(target);

    return nextState;
}

function addContainerPropertyReferenceState(
    state: Readonly<CallbackReferenceState>,
    target: TrackedBinding,
    trackedProperties: ReadonlySet<string>
): CallbackReferenceState {
    const nextState = cloneReferenceState(state);

    nextState.containerPropertiesByBinding.set(target, new Set(trackedProperties));

    return nextState;
}

function assignBindingReferenceState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackReferenceState>,
    source: Readonly<Rule.Node> | null,
    target: TrackedBinding
): CallbackReferenceState {
    if (source === null) {
        return cloneReferenceState(state);
    }

    if (isTrackedCallbackExpression(sourceCode, source, state)) {
        return addAliasBindingReferenceState(state, target);
    }

    const trackedProperties = getContainerPropertiesFromExpression(sourceCode, source, state);

    return trackedProperties === undefined
        ? cloneReferenceState(state)
        : addContainerPropertyReferenceState(state, target, trackedProperties);
}

function updateBindingReferenceState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackReferenceState>,
    operation: Readonly<Extract<CallbackHandlingOperation, { type: 'bindingAssignment'; }>>
): CallbackReferenceState {
    const clearedState = clearBindingReferenceState(state, operation.target);

    return assignBindingReferenceState(
        sourceCode,
        clearedState,
        operation.source,
        operation.target
    );
}

function updateContainerPropertyReferenceState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackReferenceState>,
    operation: Readonly<Extract<CallbackHandlingOperation, { type: 'containerPropertyAssignment'; }>>
): CallbackReferenceState {
    const nextState = cloneReferenceState(state);
    const trackedProperty = operation.propertyName ?? dynamicPropertyName;
    const nextProperties = new Set(nextState.containerPropertiesByBinding.get(operation.target));

    nextProperties.delete(trackedProperty);

    if (operation.source !== null && isTrackedCallbackExpression(sourceCode, operation.source, nextState)) {
        nextProperties.add(trackedProperty);
    }

    if (nextProperties.size === 0) {
        nextState.containerPropertiesByBinding.delete(operation.target);
    } else {
        nextState.containerPropertiesByBinding.set(operation.target, nextProperties);
    }

    return nextState;
}

function getNormalizedCallPath(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    node: Readonly<Rule.Node>
): string | undefined {
    const callPath = extractMemberExpressionPath(sourceCode, node);

    if (!isConstantPath(callPath)) {
        return undefined;
    }

    return stripCallExpressions(callPath).join('.');
}

function isKnownSingleCallbackDelegateCall(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    node: Readonly<CallExpressionNode>,
    state: Readonly<CallbackReferenceState>
): boolean {
    const normalizedCallPath = String(getNormalizedCallPath(sourceCode, asRuleNode(node.callee)));

    if (!knownSingleCallbackDelegates.has(normalizedCallPath)) {
        return false;
    }

    return node.arguments.some((argument) => {
        const candidate = argument.type === 'SpreadElement' ? argument.argument : argument;
        return isTrackedCallbackExpression(sourceCode, asRuleNode(candidate), state);
    });
}

function isCallbackHandlingCall(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    operation: Readonly<Extract<CallbackHandlingOperation, { type: 'call'; }>>,
    state: Readonly<CallbackReferenceState>
): boolean {
    return isTrackedCallbackExpression(sourceCode, asRuleNode(operation.node.callee), state) ||
        isKnownSingleCallbackDelegateCall(sourceCode, operation.node, state);
}

function mergeAliasBindings(states: readonly Readonly<CallbackReferenceState>[]): Set<TrackedBinding> {
    const aliasBindings = new Set<TrackedBinding>();

    for (const state of states) {
        for (const binding of state.aliasBindings) {
            aliasBindings.add(binding);
        }
    }

    return aliasBindings;
}

function mergeContainerProperties(
    states: readonly Readonly<CallbackReferenceState>[]
): Map<TrackedBinding, Set<string>> {
    const containerPropertiesByBinding = new Map<TrackedBinding, Set<string>>();

    for (const state of states) {
        for (const [binding, properties] of state.containerPropertiesByBinding) {
            const currentProperties = containerPropertiesByBinding.get(binding) ?? new Set<string>();

            for (const property of properties) {
                currentProperties.add(property);
            }

            containerPropertiesByBinding.set(binding, currentProperties);
        }
    }

    return containerPropertiesByBinding;
}

function mergeReferenceStates(
    states: readonly Readonly<CallbackReferenceState>[]
): CallbackReferenceState {
    return {
        aliasBindings: mergeAliasBindings(states),
        containerPropertiesByBinding: mergeContainerProperties(states)
    };
}

export function updatePathState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackPathState>,
    operation: Readonly<CallbackHandlingOperation>
): CallbackPathState {
    if (operation.type === 'bindingAssignment') {
        return {
            callbackHandled: state.callbackHandled,
            handledReferences: updateBindingReferenceState(sourceCode, state.handledReferences, operation),
            unhandledReferences: updateBindingReferenceState(sourceCode, state.unhandledReferences, operation)
        };
    }

    if (operation.type === 'containerPropertyAssignment') {
        return {
            callbackHandled: state.callbackHandled,
            handledReferences: updateContainerPropertyReferenceState(sourceCode, state.handledReferences, operation),
            unhandledReferences: updateContainerPropertyReferenceState(sourceCode, state.unhandledReferences, operation)
        };
    }

    if (!isCallbackHandlingCall(sourceCode, operation, state.unhandledReferences)) {
        return clonePathState(state);
    }

    return {
        callbackHandled: true,
        handledReferences: mergeReferenceStates([
            state.handledReferences,
            state.unhandledReferences
        ]),
        unhandledReferences: cloneReferenceState(state.unhandledReferences)
    };
}

function isCallbackHandlingCallInAnyTrackedReferenceState(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackPathState>,
    operation: Readonly<CallbackHandlingOperation>
): boolean {
    return operation.type === 'call' && (
        isCallbackHandlingCall(sourceCode, operation, state.handledReferences) ||
        isCallbackHandlingCall(sourceCode, operation, state.unhandledReferences)
    );
}

export function getCodeAfterCallbackHandlingNode(
    sourceCode: Readonly<Rule.RuleContext['sourceCode']>,
    state: Readonly<CallbackPathState>,
    operation: Readonly<CallbackHandlingOperation>
): Rule.Node | undefined {
    return state.callbackHandled && !isCallbackHandlingCallInAnyTrackedReferenceState(sourceCode, state, operation)
        ? operation.node
        : undefined;
}

function mergeIncomingPathStates(
    callbackBinding: TrackedBinding,
    previousStates: readonly Readonly<CallbackPathState>[]
): CallbackPathState {
    if (previousStates.length === 0) {
        return createInitialPathState(callbackBinding);
    }

    return {
        callbackHandled: previousStates.some((state) => {
            return state.callbackHandled;
        }),
        handledReferences: mergeReferenceStates(previousStates.map((state) => {
            return state.handledReferences;
        })),
        unhandledReferences: mergeReferenceStates(previousStates.map((state) => {
            return state.unhandledReferences;
        }))
    };
}

export function createEntryState(
    context: Readonly<CallbackHandlingContext>,
    segment: Readonly<Rule.CodePathSegment>,
    exitStatesBySegmentId: ReadonlyMap<string, Readonly<CallbackPathState>>
): CallbackPathState {
    if (segment.id === context.codePath.initialSegment.id) {
        return createInitialPathState(context.callbackBinding);
    }

    return mergeIncomingPathStates(
        context.callbackBinding,
        segment.prevSegments.map((previousSegment) => {
            return exitStatesBySegmentId.get(previousSegment.id) ?? createInitialPathState(context.callbackBinding);
        })
    );
}
