import type { Rule, SourceCode } from 'eslint';
import { asRuleNode } from './ast/rule-node.js';
import {
    applyBindingSourceValue,
    applyContainerPropertyAssignment as applyTrackedContainerPropertyAssignment,
    clonePendingPathState,
    createHandledPendingPathState,
    createInitialPendingPathState,
    getTrackedContainerPropertiesFromExpression,
    haveSamePendingPathStates,
    isTrackedCallbackExpression,
    mergeIncomingPendingPathStates,
    type PendingPathState,
    type TrackedBinding
} from './tracked-callback-reference-state.js';

type CallExpressionNode = Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0];

type Operation =
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

type AnalysisContext = {
    callbackBinding: TrackedBinding;
    codePath: Readonly<Rule.CodePath>;
    operationsBySegmentId: ReadonlyMap<string, readonly Operation[]>;
    sourceCode: Readonly<SourceCode>;
};

function isHandledHandoffExpression(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<Rule.Node>,
    state: Readonly<PendingPathState>
): boolean {
    if (isTrackedCallbackExpression(sourceCode, node, state)) {
        return true;
    }

    return (getTrackedContainerPropertiesFromExpression(sourceCode, node, state)?.size ?? 0) > 0;
}

function callFinishesPendingPaths(
    sourceCode: Readonly<SourceCode>,
    node: Readonly<CallExpressionNode>,
    state: Readonly<PendingPathState>
): boolean {
    if (isTrackedCallbackExpression(sourceCode, asRuleNode(node.callee), state)) {
        return true;
    }

    return node.arguments.some((argument) => {
        const candidate = argument.type === 'SpreadElement' ? argument.argument : argument;
        return isHandledHandoffExpression(sourceCode, asRuleNode(candidate), state);
    });
}

function applyBindingAssignment(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    operation: Extract<Operation, { type: 'bindingAssignment'; }>
): PendingPathState {
    const nextState = clonePendingPathState(state);

    nextState.aliasBindings.delete(operation.target);
    nextState.containerPropertiesByBinding.delete(operation.target);

    return applyBindingSourceValue(sourceCode, nextState, operation.source, operation.target);
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
        return callFinishesPendingPaths(sourceCode, operation.node, state)
            ? createHandledPendingPathState()
            : clonePendingPathState(state);
    }

    return applyTrackedContainerPropertyAssignment(sourceCode, state, operation);
}

function runOperations(
    sourceCode: Readonly<SourceCode>,
    entryState: Readonly<PendingPathState>,
    operations: readonly Operation[]
): PendingPathState {
    let nextState = clonePendingPathState(entryState);

    for (const operation of operations) {
        nextState = applyOperation(sourceCode, nextState, operation);
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
        return createInitialPendingPathState(callbackBinding);
    }

    return mergeIncomingPendingPathStates(segment.prevSegments.map((previousSegment) => {
        return exitStatesBySegmentId.get(previousSegment.id) ?? createHandledPendingPathState();
    }));
}

export function enqueueNextSegments(
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
    return (exitStatesBySegmentId.get(segment.id) ?? createHandledPendingPathState()).hasUnhandledPath;
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
            const previousState = queue.exitStatesBySegmentId.get(segment.id);

            if (previousState === undefined || !haveSamePendingPathStates(previousState, nextState)) {
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
