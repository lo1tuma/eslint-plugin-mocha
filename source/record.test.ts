import assert from 'node:assert';
import { suite, test } from 'mocha';
import { hasProperty, isRecord } from './record.js';

suite('record', function () {
    suite('isRecord()', function () {
        test('returns true for plain objects', function () {
            assert.strictEqual(isRecord({ foo: 'bar' }), true);
        });

        test('returns false for null', function () {
            assert.strictEqual(isRecord(null), false);
        });

        test('returns false for arrays', function () {
            assert.strictEqual(isRecord([ 'foo' ]), false);
        });

        test('returns false for primitive values', function () {
            assert.strictEqual(isRecord('foo'), false);
        });
    });

    suite('hasProperty()', function () {
        test('returns true for own properties', function () {
            assert.strictEqual(hasProperty({ foo: 'bar' }, 'foo'), true);
        });

        test('returns false for missing properties', function () {
            assert.strictEqual(hasProperty({ foo: 'bar' }, 'baz'), false);
        });

        test('returns false for inherited properties', function () {
            const objectWithInheritedProperty = Object.create({ foo: 'bar' }) as Record<string, unknown>;

            assert.strictEqual(hasProperty(objectWithInheritedProperty, 'foo'), false);
        });
    });
});
