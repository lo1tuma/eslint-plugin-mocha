import { findVariable, getStringIfConstant } from '@eslint-community/eslint-utils';
import type { Rule, Scope, SourceCode } from 'eslint';
import type { Except } from 'type-fest';

type CallExpressionNode = Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0];
type MemberExpressionNode = Parameters<Exclude<Rule.RuleListener['MemberExpression'], undefined>>[0];
type PropertyNode = Parameters<Exclude<Rule.RuleListener['Property'], undefined>>[0];
type IdentifierNode = Parameters<Exclude<Rule.RuleListener['Identifier'], undefined>>[0];
type ObjectExpressionNode = Parameters<Exclude<Rule.RuleListener['ObjectExpression'], undefined>>[0];
type NodeWithoutParent = Except<Rule.Node, 'parent'>;
type IdentifierLike = Readonly<Pick<IdentifierNode, 'name' | 'type'>>;
type MemberExpressionLike = Readonly<Pick<MemberExpressionNode, 'computed' | 'object' | 'property' | 'type'>>;
type PropertyLike = Readonly<Pick<PropertyNode, 'computed' | 'key' | 'type'>>;

const dynamicPropertyName = '<dynamic>';

export type TrackedBinding = Scope.Variable | string;

export type Operation =
    | {
        node: Readonly<CallExpressionNode>;
        type: 'call';
    }
    | {
        propertyName: string | undefined;
        source: Readonly<Rule.Node> | null;
        target: TrackedBinding;
        type: 'containerPropertyAssignment';
    }
    | {
        source: Readonly<Rule.Node> | null;
        target: TrackedBinding;
        type: 'bindingAssignment';
    };

type PendingPathState = {
    aliasBindings: Set<TrackedBinding>;
    containerPropertiesByBinding: Map<TrackedBinding, Set<string>>;
    hasUnhandledPath: boolean;
};

type AnalysisContext = {
    callbackBinding: TrackedBinding;
    codePath: Readonly<Rule.CodePath>;
    operationsBySegmentId: ReadonlyMap<string, readonly Operation[]>;
    sourceCode: Readonly<SourceCode>;
};

export function asRuleNode(node: unknown): Rule.Node {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- eslint core nodes have parent at runtime
    return node as Rule.Node;
}

export function asRuleNodeOrNull(node: Readonly<NodeWithoutParent> | null | undefined): Rule.Node | null {
    return node === null || node === undefined ? null : asRuleNode(node);
}

export function getTrackedBinding(sourceCode: Readonly<SourceCode>, node: IdentifierLike): TrackedBinding {
    return findVariable(sourceCode.getScope(asRuleNode(node)), node.name) ?? node.name;
}

type BindingAndProperty = {
    binding: TrackedBinding;
    propertyName: string | undefined;
};
type NonEmptyPendingPathStates = readonly [Readonly<PendingPathState>, ...Readonly<PendingPathState>[]];

function hasPendingPathStates(
    states: readonly Readonly<PendingPathState>[]
): states is NonEmptyPendingPathStates {
    return states.length > 0;
}

function getComputedPropertyName(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike | PropertyLike
): string | undefined {
    const keyNode = node.type === 'MemberExpression' ? node.property : node.key;

    return getStringIfConstant(keyNode, sourceCode.getScope(asRuleNode(node))) ?? undefined;
}

function getNamedPropertyName(node: MemberExpressionLike | PropertyLike): string | undefined {
    const keyNode = node.type === 'MemberExpression' ? node.property : node.key;

    if (keyNode.type === 'Identifier') {
        return keyNode.name;
    }
    if (keyNode.type === 'Literal' && keyNode.value !== null) {
        return String(keyNode.value);
    }

    return undefined;
}

function getStaticPropertyName(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike | PropertyLike
): string | undefined {
    return node.computed
        ? getComputedPropertyName(sourceCode, node)
        : getNamedPropertyName(node);
}

export function getMemberExpressionBindingAndProperty(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike
): Readonly<BindingAndProperty> | undefined {
    if (node.object.type !== 'Identifier') {
        return undefined;
    }

    return {
        binding: getTrackedBinding(sourceCode, node.object),
        propertyName: getStaticPropertyName(sourceCode, node)
    };
}

function createHandledState(): PendingPathState {
    return {
        aliasBindings: new Set(),
        containerPropertiesByBinding: new Map(),
        hasUnhandledPath: false
    };
}

function createInitialState(callbackBinding: TrackedBinding): PendingPathState {
    return {
        aliasBindings: new Set([callbackBinding]),
        containerPropertiesByBinding: new Map(),
        hasUnhandledPath: true
    };
}

function copyState(state: Readonly<PendingPathState>): PendingPathState {
    return {
        aliasBindings: new Set(state.aliasBindings),
        containerPropertiesByBinding: new Map(
            Array.from(state.containerPropertiesByBinding, ([binding, properties]) => {
                return [binding, new Set(properties)] as const;
            })
        ),
        hasUnhandledPath: state.hasUnhandledPath
    };
}

export function haveSameTrackedBindings(
    left: ReadonlySet<TrackedBinding>,
    right: ReadonlySet<TrackedBinding>
): boolean {
    if (left.size !== right.size) {
        return false;
    }

    return Array.from(left).every((binding) => {
        return right.has(binding);
    });
}

export function haveSameTrackedContainerProperties(
    left: ReadonlyMap<TrackedBinding, ReadonlySet<string>>,
    right: ReadonlyMap<TrackedBinding, ReadonlySet<string>>
): boolean {
    if (left.size !== right.size) {
        return false;
    }

    return Array.from(left).every(([binding, properties]) => {
        const otherProperties = right.get(binding);

        if (otherProperties === undefined || properties.size !== otherProperties.size) {
            return false;
        }

        return Array.from(properties).every((property) => {
            return otherProperties.has(property);
        });
    });
}

function sameState(left: Readonly<PendingPathState> | undefined, right: Readonly<PendingPathState>): boolean {
    return left !== undefined &&
        left.hasUnhandledPath === right.hasUnhandledPath &&
        haveSameTrackedBindings(left.aliasBindings, right.aliasBindings) &&
        haveSameTrackedContainerProperties(
            left.containerPropertiesByBinding,
            right.containerPropertiesByBinding
        );
}

function intersectBindingSets(states: NonEmptyPendingPathStates): Set<TrackedBinding> {
    const [firstState, ...otherStates] = states;
    const bindings = new Set(firstState?.aliasBindings);

    for (const binding of Array.from(bindings)) {
        const isSharedBinding = otherStates.every((state) => {
            return state.aliasBindings.has(binding);
        });

        if (!isSharedBinding) {
            bindings.delete(binding);
        }
    }

    return bindings;
}

function sharedPropertiesForBinding(
    binding: TrackedBinding,
    firstProperties: ReadonlySet<string>,
    otherStates: readonly Readonly<PendingPathState>[]
): Set<string> {
    const sharedProperties = new Set(firstProperties);

    for (const property of Array.from(sharedProperties)) {
        const isSharedProperty = otherStates.every((state) => {
            return state.containerPropertiesByBinding.get(binding)?.has(property) === true;
        });

        if (!isSharedProperty) {
            sharedProperties.delete(property);
        }
    }

    return sharedProperties;
}

function intersectPropertyMaps(states: NonEmptyPendingPathStates): Map<TrackedBinding, Set<string>> {
    const [firstState, ...otherStates] = states;
    const sharedPropertiesByBinding = new Map<TrackedBinding, Set<string>>();

    for (const [binding, properties] of firstState.containerPropertiesByBinding) {
        const sharedProperties = sharedPropertiesForBinding(binding, properties, otherStates);

        if (sharedProperties.size > 0) {
            sharedPropertiesByBinding.set(binding, sharedProperties);
        }
    }

    return sharedPropertiesByBinding;
}

function mergeIncomingStates(previousStates: readonly Readonly<PendingPathState>[]): PendingPathState {
    const unhandledStates = previousStates.filter((state) => {
        return state.hasUnhandledPath;
    });

    if (!hasPendingPathStates(unhandledStates)) {
        return createHandledState();
    }

    return {
        aliasBindings: intersectBindingSets(unhandledStates),
        containerPropertiesByBinding: intersectPropertyMaps(unhandledStates),
        hasUnhandledPath: true
    };
}

function getContainerProperties(
    state: Readonly<PendingPathState>,
    binding: TrackedBinding
): ReadonlySet<string> | undefined {
    return state.containerPropertiesByBinding.get(binding);
}

function isTrackedPropertyAccess(
    sourceCode: Readonly<SourceCode>,
    node: MemberExpressionLike,
    state: Readonly<PendingPathState>
): boolean {
    const bindingAndProperty = getMemberExpressionBindingAndProperty(sourceCode, node);

    if (bindingAndProperty === undefined) {
        return false;
    }

    const properties = getContainerProperties(state, bindingAndProperty.binding);

    if (properties === undefined) {
        return false;
    }

    if (bindingAndProperty.propertyName === undefined) {
        return properties.has(dynamicPropertyName);
    }

    return properties.has(bindingAndProperty.propertyName);
}

function isCallbackExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<PendingPathState>
): boolean {
    if (node.type === 'Identifier') {
        return state.aliasBindings.has(getTrackedBinding(sourceCode, node));
    }

    return node.type === 'MemberExpression' && isTrackedPropertyAccess(sourceCode, node, state);
}

function collectTrackedObjectProperties(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<ObjectExpressionNode>,
    state: Readonly<PendingPathState>
): Set<string> {
    const trackedProperties = new Set<string>();

    for (const property of node.properties) {
        if (property.type === 'Property' && property.kind === 'init') {
            const propertyName = getStaticPropertyName(sourceCode, property);
            const isTrackedCallback = propertyName !== undefined &&
                isCallbackExpression(sourceCode, asRuleNode(property.value), state);

            if (isTrackedCallback) {
                trackedProperties.add(propertyName);
            }
        }
    }

    return trackedProperties;
}

function getContainerPropertiesFromExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<PendingPathState>
): Set<string> | undefined {
    if (node.type === 'Identifier') {
        const properties = getContainerProperties(state, getTrackedBinding(sourceCode, node));

        return properties === undefined ? undefined : new Set(properties);
    }

    if (node.type === 'ObjectExpression') {
        const trackedProperties = collectTrackedObjectProperties(sourceCode, node, state);

        return trackedProperties.size > 0 ? trackedProperties : undefined;
    }

    return undefined;
}

function isHandledHandoffExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<PendingPathState>
): boolean {
    if (isCallbackExpression(sourceCode, node, state)) {
        return true;
    }

    return (getContainerPropertiesFromExpression(sourceCode, node, state)?.size ?? 0) > 0;
}

function callFinishesPendingPaths(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<CallExpressionNode>,
    state: Readonly<PendingPathState>
): boolean {
    if (isCallbackExpression(sourceCode, asRuleNode(node.callee), state)) {
        return true;
    }

    return node.arguments.some((argument) => {
        const candidate = argument.type === 'SpreadElement' ? argument.argument : argument;
        return isHandledHandoffExpression(sourceCode, asRuleNode(candidate), state);
    });
}

function applyBindingSourceValue(
    sourceCode: Readonly<SourceCode>,
    state: PendingPathState,
    operation: Extract<Operation, { type: 'bindingAssignment'; }>
): PendingPathState {
    if (operation.source === null) {
        return state;
    }

    if (isCallbackExpression(sourceCode, operation.source, state)) {
        state.aliasBindings.add(operation.target);
        return state;
    }

    const containerProperties = getContainerPropertiesFromExpression(sourceCode, operation.source, state);

    if (containerProperties !== undefined) {
        state.containerPropertiesByBinding.set(operation.target, containerProperties);
    }

    return state;
}

function applyBindingAssignment(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    operation: Extract<Operation, { type: 'bindingAssignment'; }>
): PendingPathState {
    const nextState = copyState(state);

    nextState.aliasBindings.delete(operation.target);
    nextState.containerPropertiesByBinding.delete(operation.target);

    return applyBindingSourceValue(sourceCode, nextState, operation);
}

function nextPropertiesForAssignment(
    currentProperties: ReadonlySet<string> | undefined,
    propertyName: string | undefined
): Set<string> {
    const nextProperties = new Set(currentProperties);

    if (propertyName === undefined) {
        nextProperties.clear();
    } else {
        nextProperties.delete(propertyName);
    }

    return nextProperties;
}

function applyContainerPropertyAssignment(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    operation: Extract<Operation, { type: 'containerPropertyAssignment'; }>
): PendingPathState {
    const nextState = copyState(state);
    const nextProperties = nextPropertiesForAssignment(
        nextState.containerPropertiesByBinding.get(operation.target),
        operation.propertyName
    );
    const shouldTrackProperty = operation.source !== null &&
        isCallbackExpression(sourceCode, operation.source, nextState);

    if (shouldTrackProperty) {
        nextProperties.add(operation.propertyName ?? dynamicPropertyName);
    }

    if (nextProperties.size === 0) {
        nextState.containerPropertiesByBinding.delete(operation.target);
    } else {
        nextState.containerPropertiesByBinding.set(operation.target, nextProperties);
    }

    return nextState;
}

function applyOperation(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    operation: Operation
): PendingPathState {
    if (operation.type === 'bindingAssignment') {
        return applyBindingAssignment(sourceCode, state, operation);
    }

    if (operation.type === 'call') {
        return callFinishesPendingPaths(sourceCode, operation.node, state) ? createHandledState() : copyState(state);
    }

    return applyContainerPropertyAssignment(sourceCode, state, operation);
}

function runOperations(
    sourceCode: Readonly<SourceCode>,
    entryState: Readonly<PendingPathState>,
    operations: readonly Operation[]
): PendingPathState {
    let nextState = copyState(entryState);

    for (const operation of operations) {
        if (nextState.hasUnhandledPath) {
            nextState = applyOperation(sourceCode, nextState, operation);
        }
    }

    return nextState;
}

function computeEntryState(
    callbackBinding: TrackedBinding,
    initialSegmentId: string,
    segment: Readonly<Rule.CodePathSegment>,
    exitStatesBySegmentId: ReadonlyMap<string, Readonly<PendingPathState>>
): PendingPathState {
    if (segment.id === initialSegmentId) {
        return createInitialState(callbackBinding);
    }

    return mergeIncomingStates(segment.prevSegments.map((previousSegment) => {
        return exitStatesBySegmentId.get(previousSegment.id) ?? createHandledState();
    }));
}

function enqueueNextSegments(
    nextSegments: readonly Readonly<Rule.CodePathSegment>[],
    pendingSegments: Rule.CodePathSegment[],
    queuedSegmentIds: Set<string>
): void {
    for (const nextSegment of nextSegments) {
        if (!queuedSegmentIds.has(nextSegment.id)) {
            pendingSegments.push(nextSegment);
            queuedSegmentIds.add(nextSegment.id);
        }
    }
}

function segmentHasUnhandledReturnPath(
    exitStatesBySegmentId: ReadonlyMap<string, Readonly<PendingPathState>>,
    segment: Readonly<Rule.CodePathSegment>
): boolean {
    return (exitStatesBySegmentId.get(segment.id) ?? createHandledState()).hasUnhandledPath;
}

type PendingSegmentQueue = {
    exitStatesBySegmentId: Map<string, Readonly<PendingPathState>>;
    pendingSegments: Rule.CodePathSegment[];
    queuedSegmentIds: Set<string>;
};

function processPendingSegment(
    context: Readonly<AnalysisContext>,
    segment: Readonly<Rule.CodePathSegment>,
    exitStatesBySegmentId: Map<string, Readonly<PendingPathState>>
): Readonly<PendingPathState> {
    const entryState = computeEntryState(
        context.callbackBinding,
        context.codePath.initialSegment.id,
        segment,
        exitStatesBySegmentId
    );

    return runOperations(
        context.sourceCode,
        entryState,
        context.operationsBySegmentId.get(segment.id) ?? []
    );
}

function hasUnprocessedSegments(pendingSegments: readonly Rule.CodePathSegment[]): boolean {
    return pendingSegments.length > 0;
}

function createPendingSegmentQueue(context: Readonly<AnalysisContext>): PendingSegmentQueue {
    return {
        exitStatesBySegmentId: new Map<string, Readonly<PendingPathState>>(),
        pendingSegments: [context.codePath.initialSegment],
        queuedSegmentIds: new Set([context.codePath.initialSegment.id])
    };
}

function processAllPendingSegments(
    context: Readonly<AnalysisContext>,
    queue: PendingSegmentQueue
): void {
    while (hasUnprocessedSegments(queue.pendingSegments)) {
        const segment = queue.pendingSegments.shift();

        if (segment !== undefined) {
            queue.queuedSegmentIds.delete(segment.id);

            const nextState = processPendingSegment(context, segment, queue.exitStatesBySegmentId);

            if (!sameState(queue.exitStatesBySegmentId.get(segment.id), nextState)) {
                queue.exitStatesBySegmentId.set(segment.id, nextState);
                enqueueNextSegments(segment.nextSegments, queue.pendingSegments, queue.queuedSegmentIds);
            }
        }
    }
}

export function hasUnhandledReturnPath(context: Readonly<AnalysisContext>): boolean {
    const queue = createPendingSegmentQueue(context);

    processAllPendingSegments(context, queue);

    return context.codePath.returnedSegments.some((segment) => {
        return segmentHasUnhandledReturnPath(queue.exitStatesBySegmentId, segment);
    });
}
