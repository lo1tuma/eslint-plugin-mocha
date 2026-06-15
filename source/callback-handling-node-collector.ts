import type { Rule } from 'eslint';
import {
    arePathStatesSame,
    type CallbackHandlingContext,
    type CallbackHandlingOperation,
    type CallbackPathState,
    clonePathState,
    createEntryState,
    updatePathState
} from './callback-handling-state.js';
import { enqueueNextSegments } from './done-callback-paths.js';

type PathState = CallbackPathState;
type PendingSegmentCollection = {
    readonly exitStatesBySegmentId: ReadonlyMap<string, PathState>;
    readonly pendingSegments: readonly Rule.CodePathSegment[];
    readonly queuedSegmentIds: ReadonlySet<string>;
    readonly reportedNodeSet: WeakSet<Rule.Node>;
    readonly reportedNodes: readonly Rule.Node[];
};
type PendingSegmentCollectionWithPendingSegments = PendingSegmentCollection & {
    readonly pendingSegments: readonly [Rule.CodePathSegment, ...readonly Rule.CodePathSegment[]];
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

    return [ reportedNodes, nextState ];
}

function recordReportedNodes(
    reportedNodes: readonly Rule.Node[],
    reportedNodeSet: WeakSet<Rule.Node>,
    segmentReportedNodes: readonly Rule.Node[]
): readonly Rule.Node[] {
    let nextReportedNodes = reportedNodes;

    for (const reportedNode of segmentReportedNodes) {
        if (!reportedNodeSet.has(reportedNode)) {
            reportedNodeSet.add(reportedNode);
            nextReportedNodes = [ ...nextReportedNodes, reportedNode ];
        }
    }

    return nextReportedNodes;
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
    collection: Readonly<PendingSegmentCollection>,
    segment: Readonly<Rule.CodePathSegment>,
    selectReportedNode: ReportedNodeSelector
): PendingSegmentCollection {
    const entryState = createEntryState(context, segment, collection.exitStatesBySegmentId);
    const [ segmentReportedNodes, nextState ] = collectSegmentReportedNodes(
        context,
        entryState,
        segment,
        selectReportedNode
    );
    const reportedNodes = recordReportedNodes(
        collection.reportedNodes,
        collection.reportedNodeSet,
        segmentReportedNodes
    );

    if (shouldRevisitSegment(collection, nextState, segment, segmentReportedNodes)) {
        const [ pendingSegments, queuedSegmentIds ] = enqueueNextSegments(
            segment.nextSegments,
            collection.pendingSegments,
            collection.queuedSegmentIds
        );

        return {
            ...collection,
            exitStatesBySegmentId: new Map([
                ...collection.exitStatesBySegmentId,
                [ segment.id, nextState ]
            ]),
            pendingSegments,
            queuedSegmentIds,
            reportedNodes
        };
    }

    return { ...collection, reportedNodes };
}

function createPendingSegmentCollection(
    context: Readonly<CallbackHandlingContext>
): PendingSegmentCollection {
    const queuedSegmentIds = new Set<string>();

    return {
        exitStatesBySegmentId: new Map(),
        pendingSegments: [ context.codePath.initialSegment ],
        queuedSegmentIds,
        reportedNodeSet: new WeakSet(),
        reportedNodes: []
    };
}

function dropPendingSegment(collection: Readonly<PendingSegmentCollectionWithPendingSegments>): readonly [
    Rule.CodePathSegment,
    PendingSegmentCollection
] {
    const [ segment, ...pendingSegments ] = collection.pendingSegments;

    return [
        segment,
        {
            ...collection,
            pendingSegments,
            queuedSegmentIds: new Set(
                Array.from(collection.queuedSegmentIds).filter(function (segmentId) {
                    return segmentId !== segment.id;
                })
            )
        }
    ];
}

function hasPendingSegment(
    collection: Readonly<PendingSegmentCollection>
): collection is PendingSegmentCollectionWithPendingSegments {
    return collection.pendingSegments.length > 0;
}

function processPendingSegments(
    context: Readonly<CallbackHandlingContext>,
    initialCollection: PendingSegmentCollection,
    selectReportedNode: ReportedNodeSelector
): PendingSegmentCollection {
    let collection = initialCollection;

    while (hasPendingSegment(collection)) {
        const [ segment, nextCollection ] = dropPendingSegment(collection);
        collection = nextCollection;

        collection = processPendingSegment(context, collection, segment, selectReportedNode);
    }

    return collection;
}

export function collectCallbackHandlingNodes(
    context: Readonly<CallbackHandlingContext>,
    selectReportedNode: ReportedNodeSelector
): readonly Rule.Node[] {
    const collection = createPendingSegmentCollection(context);
    const processedCollection = processPendingSegments(context, collection, selectReportedNode);

    return processedCollection.reportedNodes;
}
