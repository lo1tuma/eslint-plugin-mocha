import assert from 'node:assert';
import { suite, test } from 'mocha';
import {
    filterWithArgs,
    flatMapWithArgs,
    getLastOrThrow,
    mapWithArgs,
    reduceWithArgs
} from './list.ts';

suite('list helpers', function () {
    test('flatMapWithArgs() maps and flattens with additional args', function () {
        const result = flatMapWithArgs([ 1, 2 ], function (item, suffix: string) {
            return [ `${item}${suffix}`, `${item + 1}${suffix}` ];
        }, 'x');

        assert.deepStrictEqual(result, [ '1x', '2x', '2x', '3x' ]);
    });

    test('mapWithArgs() maps with additional args', function () {
        const result = mapWithArgs([ 1, 2, 3 ], function (item, multiplier: number) {
            return item * multiplier;
        }, 2);

        assert.deepStrictEqual(result, [ 2, 4, 6 ]);
        assert.strictEqual(result.length, 3);
    });

    test('filterWithArgs() filters with additional args', function () {
        const result = filterWithArgs([ 1, 2, 3, 4 ], function (item, divisor: number) {
            return item % divisor === 0;
        }, 2);

        assert.deepStrictEqual(result, [ 2, 4 ]);
    });

    test('reduceWithArgs() reduces with additional args', function () {
        const result = reduceWithArgs<number, number, [number]>(
            [ 1, 2, 3 ],
            function (accumulator, item, multiplier: number) {
                return accumulator + item * multiplier;
            },
            0,
            3
        );

        assert.strictEqual(result, 18);
    });

    test('getLastOrThrow() returns the last item', function () {
        const result = getLastOrThrow([ 1, 2, 3 ]);

        assert.strictEqual(result, 3);
    });

    test('getLastOrThrow() throws for an empty list', function () {
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
