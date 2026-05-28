import type { Rule } from 'eslint';
import {
    arePathStatesSame,
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    clonePathState,
    createEntryState,
    updatePathState
} from './callback-handling-state.js';
import { enqueueNextSegments } from './done-callback-paths.js';

type PathState = ReturnType<typeof clonePathState>;
type PendingSegmentCollection = {
    exitStatesBySegmentId: Map<string, PathState>;
    pendingSegments: Rule.CodePathSegment[];
    queuedSegmentIds: Set<string>;
    reportedNodeSet: WeakSet<Rule.Node>;
    reportedNodes: Rule.Node[];
};
type ReportedNodeSelector = (
    context: Readonly<CallbackHandlingContext>,
    pathState: Readonly<PathState>,
    operation: Readonly<CallbackHandlingOperation>
) => Rule.Node | undefined;

function collectSegmentReportedNodes(
    context: Readonly<CallbackHandlingContext>,
    entryState: PathState,
    segment: Readonly<Rule.CodePathSegment>,
    selectReportedNode: ReportedNodeSelector
): readonly [Rule.Node[], PathState] {
    const reportedNodes: Rule.Node[] = [];
    let nextState = clonePathState(entryState);

    for (const operation of context.operationsBySegmentId.get(segment.id) ?? []) {
        const reportedNode = selectReportedNode(context, nextState, operation);

        if (reportedNode !== undefined) {
            reportedNodes.push(reportedNode);
        }

        nextState = updatePathState(context.sourceCode, nextState, operation);
    }

    return [reportedNodes, nextState];
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
    nextState: PathState,
    segment: Readonly<Rule.CodePathSegment>,
    segmentReportedNodes: readonly Rule.Node[]
): boolean {
    return segmentReportedNodes.length > 0 ||
        !arePathStatesSame(collection.exitStatesBySegmentId.get(segment.id), nextState);
}

function processPendingSegment(
    context: Readonly<CallbackHandlingContext>,
    collection: PendingSegmentCollection,
    segment: Readonly<Rule.CodePathSegment>,
    selectReportedNode: ReportedNodeSelector
): void {
    collection.queuedSegmentIds.delete(segment.id);

    const entryState = createEntryState(context, segment, collection.exitStatesBySegmentId);
    const [segmentReportedNodes, nextState] = collectSegmentReportedNodes(
        context,
        entryState,
        segment,
        selectReportedNode
    );

    recordReportedNodes(collection.reportedNodes, collection.reportedNodeSet, segmentReportedNodes);

    if (shouldRevisitSegment(collection, nextState, segment, segmentReportedNodes)) {
        collection.exitStatesBySegmentId.set(segment.id, nextState);
        enqueueNextSegments(segment.nextSegments, collection.pendingSegments, collection.queuedSegmentIds);
    }
}

function createPendingSegmentCollection(
    context: Readonly<CallbackHandlingContext>
): PendingSegmentCollection {
    const queuedSegmentIds = new Set<string>();

    return {
        exitStatesBySegmentId: new Map(),
        pendingSegments: [context.codePath.initialSegment],
        queuedSegmentIds,
        reportedNodeSet: new WeakSet(),
        reportedNodes: []
    };
}

function processPendingSegments(
    context: Readonly<CallbackHandlingContext>,
    collection: PendingSegmentCollection,
    selectReportedNode: ReportedNodeSelector
): void {
    for (
        let segment = collection.pendingSegments.shift();
        segment !== undefined;
        segment = collection.pendingSegments.shift()
    ) {
        processPendingSegment(context, collection, segment, selectReportedNode);
    }
}

export function collectCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>,
    selectReportedNode: ReportedNodeSelector
): readonly Rule.Node[] {
    const collection = createPendingSegmentCollection(context);

    processPendingSegments(context, collection, selectReportedNode);

    return collection.reportedNodes;
}
