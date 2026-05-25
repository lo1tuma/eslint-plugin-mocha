import type { Rule } from 'eslint';
import {
    arePathStatesSame,
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    clonePathState,
    createEntryState,
    getCodeAfterCallbackHandlingNode,
    updatePathState
} from './callback-handling-state.js';

type PendingSegmentCollection = {
    exitStatesBySegmentId: Map<string, ReturnType<typeof clonePathState>>;
    pendingSegments: Rule.CodePathSegment[];
    queuedSegmentIds: Set<string>;
    reportedNodeSet: WeakSet<Rule.Node>;
    reportedNodes: Rule.Node[];
};

function getRepeatedCallbackHandlingNode(
    context: Readonly<CallbackHandlingContext>,
    pathState: ReturnType<typeof clonePathState>,
    operation: Readonly<CallbackHandlingOperation>
): Rule.Node | undefined {
    if (operation.type !== 'call' || !pathState.callbackHandled) {
        return undefined;
    }

    return getCodeAfterCallbackHandlingNode(context.sourceCode, pathState, operation) === undefined
        ? operation.node
        : undefined;
}

function collectSegmentRepeatedCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>,
    entryState: ReturnType<typeof clonePathState>,
    segment: Readonly<Rule.CodePathSegment>
): readonly [Rule.Node[], ReturnType<typeof clonePathState>] {
    const reportedNodes: Rule.Node[] = [];
    let nextState = clonePathState(entryState);

    for (const operation of context.operationsBySegmentId.get(segment.id) ?? []) {
        const repeatedCallbackHandlingNode = getRepeatedCallbackHandlingNode(context, nextState, operation);

        if (repeatedCallbackHandlingNode !== undefined) {
            reportedNodes.push(repeatedCallbackHandlingNode);
        }

        nextState = updatePathState(context.sourceCode, nextState, operation);
    }

    return [reportedNodes, nextState];
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

function recordReportedNodes(
    reportedNodes: Rule.Node[],
    reportedNodeSet: WeakSet<Rule.Node>,
    segmentReportedNodes: readonly Rule.Node[]
): void {
    for (const reportedNode of segmentReportedNodes) {
        if (!reportedNodeSet.has(reportedNode)) {
            reportedNodeSet.add(reportedNode);
            reportedNodes.push(reportedNode);
        }
    }
}

function shouldRevisitSegment(
    collection: Readonly<PendingSegmentCollection>,
    nextState: ReturnType<typeof clonePathState>,
    segment: Readonly<Rule.CodePathSegment>,
    segmentReportedNodes: readonly Rule.Node[]
): boolean {
    return segmentReportedNodes.length > 0 ||
        !arePathStatesSame(collection.exitStatesBySegmentId.get(segment.id), nextState);
}

function processPendingSegment(
    context: Readonly<CallbackHandlingContext>,
    collection: PendingSegmentCollection,
    segment: Readonly<Rule.CodePathSegment>
): void {
    collection.queuedSegmentIds.delete(segment.id);

    const entryState = createEntryState(context, segment, collection.exitStatesBySegmentId);
    const [segmentReportedNodes, nextState] = collectSegmentRepeatedCallbackHandlingNodes(
        context,
        entryState,
        segment
    );

    recordReportedNodes(collection.reportedNodes, collection.reportedNodeSet, segmentReportedNodes);

    if (shouldRevisitSegment(collection, nextState, segment, segmentReportedNodes)) {
        collection.exitStatesBySegmentId.set(segment.id, nextState);
        enqueueNextSegments(segment.nextSegments, collection.pendingSegments, collection.queuedSegmentIds);
    }
}

export function collectRepeatedCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>
): readonly Rule.Node[] {
    const collection: PendingSegmentCollection = {
        exitStatesBySegmentId: new Map(),
        pendingSegments: [context.codePath.initialSegment],
        queuedSegmentIds: new Set([context.codePath.initialSegment.id]),
        reportedNodeSet: new WeakSet(),
        reportedNodes: []
    };

    while (collection.pendingSegments.length > 0) {
        const segment = collection.pendingSegments.shift();

        if (segment !== undefined) {
            processPendingSegment(context, collection, segment);
        }
    }

    return collection.reportedNodes;
}
