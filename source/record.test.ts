import assert from 'node:assert';
import { isRecord } from './record.js';

describe('isRecord()', function () {
    it('returns true for plain objects', function () {
        assert.strictEqual(isRecord({ foo: 'bar' }), true);
    });

    it('returns false for null', function () {
        assert.strictEqual(isRecord(null), false);
    });

    it('returns false for arrays', function () {
        assert.strictEqual(isRecord(['foo']), false);
    });

    it('returns false for primitive values', function () {
        assert.strictEqual(isRecord('foo'), false);
    });
});
