import assert from 'node:assert';
import type { AST } from 'eslint';
import { suite, test } from 'mocha';
import { expectNodeLocation, expectNodeRange } from './node-location.ts';

suite('node location helpers', function () {
    test('expectNodeRange() returns ranges and throws for missing ones', function () {
        assert.deepStrictEqual(expectNodeRange({ range: [ 4, 8 ] }), [ 4, 8 ]);
        assert.throws(function () {
            expectNodeRange({});
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected node range.';
        });
        assert.throws(function () {
            expectNodeRange({ range: null });
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected node range.';
        });
    });

    test('expectNodeLocation() returns locations and throws for missing ones', function () {
        const location: AST.SourceLocation = {
            start: { column: 2, line: 3 },
            end: { column: 4, line: 5 }
        };

        assert.strictEqual(expectNodeLocation({ loc: location }), location);
        assert.throws(function () {
            expectNodeLocation({});
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'Expected node location.';
        });
    });
});
