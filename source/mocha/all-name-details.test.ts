import assert from 'node:assert';
import { suite, test } from 'mocha';
import { getAllNames } from './all-name-details.js';

suite('all-name-details', function () {
    test('includes custom names for the require interface', function () {
        const names = getAllNames([
            { name: 'custom', type: 'suite', interface: 'BDD' }
        ], 'require');

        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'custom.only';
        }));
    });

    test('filters custom names by the configured interface', function () {
        const names = getAllNames([
            { name: 'custom', type: 'suite', interface: 'BDD' },
            { name: 'customTdd', type: 'suite', interface: 'TDD' }
        ], 'BDD');

        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(
            !names.some(function (nameDetails) {
                return nameDetails.path.join('.') === 'customTdd';
            })
        );
    });

    test('can include all interfaces regardless of the configured interface', function () {
        const names = getAllNames([], 'BDD', true);

        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'before';
        }));
        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'setup';
        }));
        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'suiteSetup' && nameDetails.type === 'hook';
        }));
        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'suiteTeardown' && nameDetails.type === 'hook';
        }));
    });

    test('includes custom names when all interfaces are enabled', function () {
        const names = getAllNames(
            [
                { name: 'custom', type: 'suite', interface: 'BDD' }
            ],
            'BDD',
            true
        );

        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'custom';
        }));
        assert.ok(names.some(function (nameDetails) {
            return nameDetails.path.join('.') === 'custom.only';
        }));
    });
});
