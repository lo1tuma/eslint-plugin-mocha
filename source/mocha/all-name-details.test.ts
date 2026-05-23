import assert from 'node:assert';
import { getAllNames } from './all-name-details.js';

describe('all-name-details', function () {
    it('includes custom names for the exports interface', function () {
        const names = getAllNames([
            { name: 'custom', type: 'suite', interface: 'BDD' }
        ], 'exports');

        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'custom.only';
        }));
    });

    it('filters custom names by the configured interface', function () {
        const names = getAllNames([
            { name: 'custom', type: 'suite', interface: 'BDD' },
            { name: 'customTdd', type: 'suite', interface: 'TDD' }
        ], 'BDD');

        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(
            !names.some((nameDetails) => {
                return nameDetails.path.join('.') === 'customTdd';
            })
        );
    });

    it('can include all interfaces regardless of the configured interface', function () {
        const names = getAllNames([], 'BDD', true);

        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'before';
        }));
        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'setup';
        }));
    });

    it('includes custom names when all interfaces are enabled', function () {
        const names = getAllNames(
            [
                { name: 'custom', type: 'suite', interface: 'BDD' }
            ],
            'BDD',
            true
        );

        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(names.some((nameDetails) => {
            return nameDetails.path.join('.') === 'custom.only';
        }));
    });
});
