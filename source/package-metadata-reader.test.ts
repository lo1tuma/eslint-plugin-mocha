import assert from 'node:assert';
import { suite, test } from 'mocha';
import { createPackageMetadataReader } from './package-metadata-reader.js';

suite('package metadata reader', function () {
    test('skips missing package files when access throws an ENOENT-shaped record', async function () {
        const visitedPaths: string[] = [];
        const readClosestPackageMetadata = createPackageMetadataReader({
            async accessFile(packageJsonPath) {
                visitedPaths.push(packageJsonPath);

                if (packageJsonPath === '/virtual/project/source/package.json') {
                    throw Object.assign(new Error('missing package metadata'), { code: 'ENOENT' });
                }
            },
            async readPackageJson(packageJsonPath) {
                assert.strictEqual(packageJsonPath, '/virtual/project/package.json');

                return {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                };
            }
        });

        const metadata = await readClosestPackageMetadata('file:///virtual/project/source/plugin.js');

        assert.deepStrictEqual(visitedPaths, [
            '/virtual/project/source/package.json',
            '/virtual/project/package.json'
        ]);
        assert.deepStrictEqual(metadata, {
            name: 'eslint-plugin-mocha',
            version: '11.3.0'
        });
    });

    test('rethrows access errors that are not ENOENT-shaped records', async function () {
        const readClosestPackageMetadata = createPackageMetadataReader({
            async accessFile() {
                throw new Error('boom');
            },
            async readPackageJson() {
                throw new Error('Unexpected package json read');
            }
        });

        await assert.rejects(async function () {
            await readClosestPackageMetadata('file:///virtual/project/plugin.js');
        }, function (error: unknown) {
            return error instanceof Error && error.message === 'boom';
        });
    });

    test('parses metadata from the imported package json module', async function () {
        const readClosestPackageMetadata = createPackageMetadataReader({
            async accessFile() {
                return undefined;
            },
            async readPackageJson() {
                return {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                };
            }
        });

        const metadata = await readClosestPackageMetadata('file:///virtual/project/plugin.js');

        assert.deepStrictEqual(metadata, {
            name: 'eslint-plugin-mocha',
            version: '11.3.0'
        });
    });
});
