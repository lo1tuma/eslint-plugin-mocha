import type { Rule } from 'eslint';
import assert from 'node:assert';
import {
    createPendingSegmentCollection,
    processPendingSegments,
    shouldRevisitSegment
} from './callback-handling-node-collector.js';
import type {
    CallbackHandlingContext,
    CallbackPathState
} from './callback-handling-state.js';

function createPathState(): CallbackPathState {
    return {
        callbackHandled: false,
        handledReferences: {
            aliasBindings: new Set(),
            containerPropertiesByBinding: new Map()
        },
        unhandledReferences: {
            aliasBindings: new Set(['done']),
            containerPropertiesByBinding: new Map()
        }
    };
}

function createSegment(id: string): Rule.CodePathSegment {
    return {
        id,
        nextSegments: [],
        prevSegments: []
    } as unknown as Rule.CodePathSegment;
}

function createCodePath(initialSegment: Rule.CodePathSegment): Rule.CodePath {
    return {
        initialSegment
    } as unknown as Rule.CodePath;
}

function createSourceCode(): Rule.RuleContext['sourceCode'] {
    return {} as unknown as Rule.RuleContext['sourceCode'];
}

function createReportedNode(): Rule.Node {
    return {
        type: 'Identifier'
    } as unknown as Rule.Node;
}

function createContext(initialSegment: Rule.CodePathSegment): CallbackHandlingContext {
    return {
        callbackBinding: 'done',
        codePath: createCodePath(initialSegment),
        operationsBySegmentId: new Map(),
        sourceCode: createSourceCode()
    };
}

describe('callback handling node collector', function () {
    it('shouldRevisitSegment() returns false for unchanged states without reports', function () {
        const segment = createSegment('start');
        const nextState = createPathState();
        const result = shouldRevisitSegment(
            {
                exitStatesBySegmentId: new Map([[segment.id, nextState]]),
                pendingSegments: [],
                queuedSegmentIds: new Set(),
                reportedNodeSet: new WeakSet(),
                reportedNodes: []
            },
            nextState,
            segment,
            []
        );

        assert.strictEqual(result, false);
    });

    it('shouldRevisitSegment() returns true when a segment reports a node', function () {
        const segment = createSegment('start');
        const nextState = createPathState();
        const reportedNode = createReportedNode();
        const result = shouldRevisitSegment(
            {
                exitStatesBySegmentId: new Map([[segment.id, nextState]]),
                pendingSegments: [],
                queuedSegmentIds: new Set(),
                reportedNodeSet: new WeakSet(),
                reportedNodes: []
            },
            nextState,
            segment,
            [reportedNode]
        );

        assert.strictEqual(result, true);
    });

    it('createPendingSegmentCollection() queues the initial segment', function () {
        const initialSegment = createSegment('start');
        const collection = createPendingSegmentCollection(createContext(initialSegment));

        assert.deepStrictEqual(collection.pendingSegments, [initialSegment]);
        assert.deepStrictEqual(Array.from(collection.queuedSegmentIds), ['start']);
    });

    it('processPendingSegments() does not revisit unchanged segments without reports', function () {
        const initialSegment = createSegment('start');
        const nextSegment = createSegment('next');
        initialSegment.nextSegments.push(nextSegment);
        nextSegment.prevSegments.push(initialSegment);
        const callbackContext = createContext(initialSegment);
        const collection = {
            exitStatesBySegmentId: new Map([[initialSegment.id, createPathState()]]),
            pendingSegments: [initialSegment],
            queuedSegmentIds: new Set([initialSegment.id]),
            reportedNodeSet: new WeakSet(),
            reportedNodes: []
        };

        processPendingSegments(callbackContext, collection, () => {
            return undefined;
        });

        assert.deepStrictEqual(Array.from(collection.exitStatesBySegmentId.keys()), ['start']);
        assert.deepStrictEqual(collection.pendingSegments, []);
        assert.deepStrictEqual(Array.from(collection.queuedSegmentIds), []);
    });

    it('processPendingSegments() ignores undefined queued segments', function () {
        const collection = {
            exitStatesBySegmentId: new Map(),
            pendingSegments: [undefined as unknown as Rule.CodePathSegment],
            queuedSegmentIds: new Set<string>(),
            reportedNodeSet: new WeakSet(),
            reportedNodes: []
        };
        let selectedNodeCount = 0;

        processPendingSegments(
            createContext(createSegment('start')),
            collection,
            () => {
                selectedNodeCount += 1;
                return undefined;
            }
        );

        assert.strictEqual(selectedNodeCount, 0);
        assert.deepStrictEqual(collection.pendingSegments, []);
        assert.deepStrictEqual(collection.reportedNodes, []);
        assert.deepStrictEqual(Array.from(collection.exitStatesBySegmentId.keys()), []);
    });
});
