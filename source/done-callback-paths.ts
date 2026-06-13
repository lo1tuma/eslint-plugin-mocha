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

type CallExpressionNode = Readonly<Parameters<Exclude<Rule.RuleListener['CallExpression'], undefined>>[0]>;

type Operation =
    | {
        readonly node: Readonly<CallExpressionNode>;
        readonly type: 'call';
    }
    | {
        readonly propertyName: string | undefined;
        readonly source: Readonly<Rule.Node> | null;
        readonly target: TrackedBinding;
        readonly type: 'containerPropertyAssignment';
    }
    | {
        readonly source: Readonly<Rule.Node> | null;
        readonly target: TrackedBinding;
        readonly type: 'bindingAssignment';
    };

type AnalysisContext = {
    readonly callbackBinding: TrackedBinding;
    readonly codePath: Readonly<Rule.CodePath>;
    readonly operationsBySegmentId: ReadonlyMap<string, readonly Operation[]>;
    readonly sourceCode: Readonly<SourceCode>;
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

    return node.arguments.some(function (argument) {
        const candidate = argument.type === 'SpreadElement' ? argument.argument : argument;
        return isHandledHandoffExpression(sourceCode, asRuleNode(candidate), state);
    });
}

function applyBindingAssignment(
    sourceCode: Readonly<SourceCode>,
    state: Readonly<PendingPathState>,
    operation: Extract<Operation, { readonly type: 'bindingAssignment'; }>
): PendingPathState {
    const nextState = {
        ...state,
        aliasBindings: new Set(
            Array.from(state.aliasBindings).filter(function (binding) {
                return binding !== operation.target;
            })
        ),
        containerPropertiesByBinding: new Map(
            Array.from(state.containerPropertiesByBinding).filter(function ([ binding ]) {
                return binding !== operation.target;
            })
        )
    };

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

    return mergeIncomingPendingPathStates(segment.prevSegments.map(function (previousSegment) {
        return exitStatesBySegmentId.get(previousSegment.id) ?? createHandledPendingPathState();
    }));
}

export function enqueueNextSegments(
    nextSegments: readonly Readonly<Rule.CodePathSegment>[],
    pendingSegments: readonly Rule.CodePathSegment[],
    queuedSegmentIds: ReadonlySet<string>
): readonly [readonly Rule.CodePathSegment[], ReadonlySet<string>] {
    let nextPendingSegments = pendingSegments;
    let nextQueuedSegmentIds = queuedSegmentIds;

    for (const nextSegment of nextSegments) {
        if (!nextQueuedSegmentIds.has(nextSegment.id)) {
            nextPendingSegments = [ ...nextPendingSegments, nextSegment ];
            nextQueuedSegmentIds = new Set([ ...nextQueuedSegmentIds, nextSegment.id ]);
        }
    }

    return [ nextPendingSegments, nextQueuedSegmentIds ];
}

function segmentHasUnhandledReturnPath(
    exitStatesBySegmentId: ReadonlyMap<string, Readonly<PendingPathState>>,
    segment: Readonly<Rule.CodePathSegment>
): boolean {
    return (exitStatesBySegmentId.get(segment.id) ?? createHandledPendingPathState()).hasUnhandledPath;
}

type PendingSegmentQueue = {
    readonly exitStatesBySegmentId: ReadonlyMap<string, Readonly<PendingPathState>>;
    readonly pendingSegments: readonly Rule.CodePathSegment[];
    readonly queuedSegmentIds: ReadonlySet<string>;
};

function processPendingSegment(
    context: Readonly<AnalysisContext>,
    segment: Readonly<Rule.CodePathSegment>,
    exitStatesBySegmentId: ReadonlyMap<string, Readonly<PendingPathState>>
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
        pendingSegments: [ context.codePath.initialSegment ],
        queuedSegmentIds: new Set([ context.codePath.initialSegment.id ])
    };
}

function removeQueuedSegmentId(
    queuedSegmentIds: ReadonlySet<string>,
    segmentId: string | undefined
): ReadonlySet<string> {
    return new Set(
        Array.from(queuedSegmentIds).filter(function (queuedSegmentId) {
            return queuedSegmentId !== segmentId;
        })
    );
}

function dropPendingSegment(queue: Readonly<PendingSegmentQueue>): readonly [
    Rule.CodePathSegment | undefined,
    PendingSegmentQueue
] {
    const [ segment, ...pendingSegments ] = queue.pendingSegments;

    return [
        segment,
        {
            ...queue,
            pendingSegments,
            queuedSegmentIds: removeQueuedSegmentId(queue.queuedSegmentIds, segment?.id)
        }
    ];
}

function processKnownPendingSegment(
    context: Readonly<AnalysisContext>,
    queue: Readonly<PendingSegmentQueue>,
    segment: Readonly<Rule.CodePathSegment>
): PendingSegmentQueue {
    const nextState = processPendingSegment(context, segment, queue.exitStatesBySegmentId);
    const previousState = queue.exitStatesBySegmentId.get(segment.id);

    if (previousState !== undefined && haveSamePendingPathStates(previousState, nextState)) {
        return queue;
    }

    const [ pendingSegments, queuedSegmentIds ] = enqueueNextSegments(
        segment.nextSegments,
        queue.pendingSegments,
        queue.queuedSegmentIds
    );

    return {
        exitStatesBySegmentId: new Map([
            ...queue.exitStatesBySegmentId,
            [ segment.id, nextState ]
        ]),
        pendingSegments,
        queuedSegmentIds
    };
}

function processAllPendingSegments(
    context: Readonly<AnalysisContext>,
    initialQueue: PendingSegmentQueue
): PendingSegmentQueue {
    let queue = initialQueue;

    while (hasUnprocessedSegments(queue.pendingSegments)) {
        const [ segment, queueWithoutSegment ] = dropPendingSegment(queue);
        queue = queueWithoutSegment;
        if (segment !== undefined) {
            queue = processKnownPendingSegment(context, queue, segment);
        }
    }

    return queue;
}

export function hasUnhandledReturnPath(context: Readonly<AnalysisContext>): boolean {
    const queue = processAllPendingSegments(context, createPendingSegmentQueue(context));

    return context.codePath.returnedSegments.some(function (segment) {
        return segmentHasUnhandledReturnPath(queue.exitStatesBySegmentId, segment);
    });
}
