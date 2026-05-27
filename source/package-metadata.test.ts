import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readClosestPackageMetadata } from './package-metadata.js';

async function withTemporaryProject(
    files: readonly { path: string; contents: string; }[],
    runTest: (projectRoot: string) => Promise<void>
): Promise<void> {
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'eslint-plugin-mocha-package-metadata-'));

    try {
        for (const file of files) {
            const filePath = path.join(projectRoot, file.path);

            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.contents, 'utf8');
        }

        await runTest(projectRoot);
    } finally {
        await fs.rm(projectRoot, { recursive: true, force: true });
    }
}

describe('package metadata', function () {
    describe('readClosestPackageMetadata()', function () {
        it('reads metadata from the current package folder', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            }], async function (projectRoot) {
                const result = await readClosestPackageMetadata(
                    pathToFileURL(path.join(projectRoot, 'plugin.js')).href
                );

                assert.deepStrictEqual(result, {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                });
            });
        });

        it('reads metadata from an ancestor package folder', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            }], async function (projectRoot) {
                const moduleFilePath = path.join(projectRoot, 'target/build/source/plugin.js');
                const result = await readClosestPackageMetadata(pathToFileURL(moduleFilePath).href);

                assert.deepStrictEqual(result, {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                });
            });
        });

        it('throws when the nearest package.json is missing required metadata', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: JSON.stringify({ name: 'eslint-plugin-mocha' })
            }], async function (projectRoot) {
                const packageJsonPath = path.join(projectRoot, 'package.json');

                await assert.rejects(
                    async function () {
                        await readClosestPackageMetadata(pathToFileURL(path.join(projectRoot, 'plugin.js')).href);
                    },
                    function (error: unknown) {
                        return error instanceof Error &&
                            error.message === `Missing package name or version in ${packageJsonPath}`;
                    }
                );
            });
        });

        it('rethrows invalid package.json parse errors', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: '{'
            }], async function (projectRoot) {
                await assert.rejects(
                    async function () {
                        await readClosestPackageMetadata(pathToFileURL(path.join(projectRoot, 'plugin.js')).href);
                    },
                    SyntaxError
                );
            });
        });

        it('throws when no package.json can be found', async function () {
            await assert.rejects(
                async function () {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                function (error: unknown) {
                    return error instanceof Error && error.message === 'Failed to find package.json for /';
                }
            );
        });

        it('rethrows package.json access errors that are not ENOENT', async function () {
            await withTemporaryProject([{
                path: 'source/package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            }, {
                path: 'source/plugin.js',
                contents: ''
            }], async function (projectRoot) {
                const sourceFolder = path.join(projectRoot, 'source');

                await fs.chmod(sourceFolder, 0o000);

                try {
                    await assert.rejects(
                        async function () {
                            await readClosestPackageMetadata(
                                pathToFileURL(path.join(projectRoot, 'source/plugin.js')).href
                            );
                        },
                        function (error: unknown) {
                            return error instanceof Error &&
                                'code' in error &&
                                typeof error.code === 'string' &&
                                error.code !== 'ENOENT';
                        }
                    );
                } finally {
                    await fs.chmod(sourceFolder, 0o700);
                }
            });
        });

        it('throws when the package module default export is not a record', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: JSON.stringify(['eslint-plugin-mocha'])
            }], async function (projectRoot) {
                const packageJsonPath = path.join(projectRoot, 'package.json');

                await assert.rejects(
                    async function () {
                        await readClosestPackageMetadata(pathToFileURL(path.join(projectRoot, 'plugin.js')).href);
                    },
                    function (error: unknown) {
                        return error instanceof Error &&
                            error.message === `Missing package name or version in ${packageJsonPath}`;
                    }
                );
            });
        });

        it('throws when the package name is not a string', async function () {
            await withTemporaryProject([{
                path: 'package.json',
                contents: JSON.stringify({
                    name: 1,
                    version: '11.3.0'
                })
            }], async function (projectRoot) {
                const packageJsonPath = path.join(projectRoot, 'package.json');

                await assert.rejects(
                    async function () {
                        await readClosestPackageMetadata(pathToFileURL(path.join(projectRoot, 'plugin.js')).href);
                    },
                    function (error: unknown) {
                        return error instanceof Error &&
                            error.message === `Missing package name or version in ${packageJsonPath}`;
                    }
                );
            });
        });
    });
});
