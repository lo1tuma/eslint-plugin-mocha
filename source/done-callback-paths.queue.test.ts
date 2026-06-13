import assert from 'node:assert';
import type { Rule } from 'eslint';
import { suite, test } from 'mocha';
import { enqueueNextSegments } from './done-callback-paths.js';

function createSegment(id: string): Rule.CodePathSegment {
    return {
        id,
        nextSegments: [],
        prevSegments: []
    } as unknown as Rule.CodePathSegment;
}

suite('done callback path queue helpers', function () {
    test('enqueueNextSegments() skips segments that are already queued', function () {
        const nextSegment = createSegment('next');
        const pendingSegments = [ nextSegment ];
        const queuedSegmentIds = new Set([ nextSegment.id ]);

        enqueueNextSegments([ nextSegment ], pendingSegments, queuedSegmentIds);

        assert.deepStrictEqual(pendingSegments, [ nextSegment ]);
        assert.deepStrictEqual(Array.from(queuedSegmentIds), [ 'next' ]);
    });
});
