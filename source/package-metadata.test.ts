import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPackageMetadataReader, type PackageMetadata } from './package-metadata.js';

type PackageMetadataReaderTestDependencies = {
    readonly accessCalls: string[];
    readonly importCalls: string[];
    readonly readClosestPackageMetadata: (currentModuleUrl: string) => Promise<PackageMetadata>;
};

function createEnoentError(): Error & { readonly code: string; } {
    return Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
}

function createPackageMetadataReaderDependencies(
    existingPackageJsonPaths: readonly string[],
    packageJsonModules: Record<string, unknown>
): PackageMetadataReaderTestDependencies {
    const existingPaths = new Set(existingPackageJsonPaths);
    const accessCalls: string[] = [];
    const importCalls: string[] = [];

    return {
        accessCalls,
        importCalls,
        readClosestPackageMetadata: createPackageMetadataReader({
            async accessFile(packageJsonPath) {
                accessCalls.push(packageJsonPath);

                if (!existingPaths.has(packageJsonPath)) {
                    throw createEnoentError();
                }
            },
            async importJsonModule(packageJsonUrl) {
                importCalls.push(packageJsonUrl);
                return packageJsonModules[packageJsonUrl];
            }
        })
    };
}

describe('package metadata', function () {
    describe('readClosestPackageMetadata()', function () {
        it('reads metadata from the current package folder', async function () {
            const packageJsonPath = '/virtual/project/package.json';
            const { accessCalls, importCalls, readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {
                        default: {
                            name: 'eslint-plugin-mocha',
                            version: '11.3.0'
                        }
                    }
                }
            );

            const result = await readClosestPackageMetadata('file:///virtual/project/plugin.js');

            assert.deepStrictEqual(result, {
                name: 'eslint-plugin-mocha',
                version: '11.3.0'
            });
            assert.deepStrictEqual(accessCalls, [packageJsonPath]);
            assert.deepStrictEqual(importCalls, [pathToFileURL(packageJsonPath).href]);
        });

        it('reads metadata from an ancestor package folder', async function () {
            const moduleFilePath = '/virtual/project/target/build/source/plugin.js';
            const packageJsonPath = '/virtual/project/package.json';
            const { accessCalls, importCalls, readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {
                        default: {
                            name: 'eslint-plugin-mocha',
                            version: '11.3.0'
                        }
                    }
                }
            );

            const result = await readClosestPackageMetadata(pathToFileURL(moduleFilePath).href);

            assert.deepStrictEqual(result, {
                name: 'eslint-plugin-mocha',
                version: '11.3.0'
            });
            assert.deepStrictEqual(accessCalls, [
                path.join('/virtual/project/target/build/source', 'package.json'),
                path.join('/virtual/project/target/build', 'package.json'),
                path.join('/virtual/project/target', 'package.json'),
                packageJsonPath
            ]);
            assert.deepStrictEqual(importCalls, [pathToFileURL(packageJsonPath).href]);
        });

        it('throws when the nearest package.json is missing required metadata', async function () {
            const packageJsonPath = '/virtual/project/package.json';
            const { readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {
                        default: { name: 'eslint-plugin-mocha' }
                    }
                }
            );

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === `Missing package name or version in ${packageJsonPath}`;
                }
            );
        });

        it('throws when the imported package module has no default export', async function () {
            const packageJsonPath = '/virtual/project/package.json';
            const { readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {}
                }
            );

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === `Missing default export in ${packageJsonPath}`;
                }
            );
        });

        it('throws when no package.json can be found', async function () {
            const { readClosestPackageMetadata } = createPackageMetadataReaderDependencies([], {});

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error && error.message === 'Failed to find package.json for /';
                }
            );
        });

        it('rethrows non-ENOENT access errors', async function () {
            const expectedError = new Error('permission denied');
            const readClosestPackageMetadata = createPackageMetadataReader({
                async accessFile() {
                    throw expectedError;
                },
                async importJsonModule() {
                    throw new Error('This should not be called');
                }
            });

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error === expectedError;
                }
            );
        });

        it('throws when the package module default export is not a record', async function () {
            const packageJsonPath = '/virtual/project/package.json';
            const { readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {
                        default: ['eslint-plugin-mocha']
                    }
                }
            );

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === `Missing package name or version in ${packageJsonPath}`;
                }
            );
        });

        it('throws when the package name is not a string', async function () {
            const packageJsonPath = '/virtual/project/package.json';
            const { readClosestPackageMetadata } = createPackageMetadataReaderDependencies(
                [packageJsonPath],
                {
                    [pathToFileURL(packageJsonPath).href]: {
                        default: {
                            name: 1,
                            version: '11.3.0'
                        }
                    }
                }
            );

            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error &&
                        error.message === `Missing package name or version in ${packageJsonPath}`;
                }
            );
        });
    });
});
