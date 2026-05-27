import assert from 'node:assert';
import {
    filterWithArgs,
    flatMapWithArgs,
    getLastOrThrow,
    mapWithArgs,
    reduceWithArgs
} from './list.js';

describe('list helpers', function () {
    it('flatMapWithArgs() maps and flattens with additional args', function () {
        const result = flatMapWithArgs([1, 2], function (item, suffix: string) {
            return [`${item}${suffix}`, `${item + 1}${suffix}`];
        }, 'x');

        assert.deepStrictEqual(result, ['1x', '2x', '2x', '3x']);
    });

    it('mapWithArgs() maps with additional args', function () {
        const result = mapWithArgs([1, 2, 3], function (item, multiplier: number) {
            return item * multiplier;
        }, 2);

        assert.deepStrictEqual(result, [2, 4, 6]);
        assert.strictEqual(result.length, 3);
    });

    it('filterWithArgs() filters with additional args', function () {
        const result = filterWithArgs([1, 2, 3, 4], function (item, divisor: number) {
            return item % divisor === 0;
        }, 2);

        assert.deepStrictEqual(result, [2, 4]);
    });

    it('reduceWithArgs() reduces with additional args', function () {
        const result = reduceWithArgs(
            [1, 2, 3],
            function (accumulator, item, multiplier: number) {
                return accumulator + item * multiplier;
            },
            0 as number,
            3
        );

        assert.strictEqual(result, 18);
    });

    it('getLastOrThrow() returns the last item', function () {
        const result = getLastOrThrow([1, 2, 3]);

        assert.strictEqual(result, 3);
    });

    it('getLastOrThrow() throws for an empty list', function () {
        assert.throws(
            function () {
                getLastOrThrow([]);
            },
            function (error: unknown) {
                return error instanceof Error && error.message === 'No item in list exists';
            }
        );
    });
});
