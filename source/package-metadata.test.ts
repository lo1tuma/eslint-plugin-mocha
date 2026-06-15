import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { suite, test } from 'mocha';
import { readClosestPackageMetadata } from './package-metadata.ts';
import { hasProperty, isRecord } from './record.ts';

type ProjectFile = {
    readonly path: string;
    readonly contents: string;
};

async function writeTemporaryProjectFiles(projectRoot: string, files: readonly ProjectFile[]): Promise<void> {
    for (const file of files) {
        const filePath = path.join(projectRoot, file.path);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.contents, 'utf8');
    }
}

async function withTemporaryProject(
    files: readonly ProjectFile[],
    runTest: (projectRoot: string) => Promise<void>
): Promise<void> {
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'eslint-plugin-mocha-package-metadata-'));

    await writeTemporaryProjectFiles(projectRoot, files);

    try {
        await runTest(projectRoot);
    } finally {
        await fs.rm(projectRoot, { recursive: true, force: true });
    }
}

function pluginModuleUrl(projectRoot: string): string {
    return pathToFileURL(path.join(projectRoot, 'plugin.js')).href;
}

function isMissingPackageMetadataError(packageJsonPath: string): (error: unknown) => boolean {
    return function checkMissingPackageMetadataError(error: unknown) {
        return error instanceof Error &&
            error.message === `Missing package name or version in ${packageJsonPath}`;
    };
}

function isMissingRootPackageJsonError(error: unknown): boolean {
    return error instanceof Error && error.message === 'Failed to find package.json for /';
}

function isPackageJsonAccessError(error: unknown): boolean {
    if (!(error instanceof Error) || !isRecord(error) || !hasProperty(error, 'code')) {
        return false;
    }

    return typeof error.code === 'string' && error.code !== 'ENOENT';
}

async function assertMissingPackageMetadata(projectRoot: string): Promise<void> {
    const packageJsonPath = path.join(projectRoot, 'package.json');

    await assert.rejects(
        async function readPackageMetadata() {
            await readClosestPackageMetadata(pluginModuleUrl(projectRoot));
        },
        isMissingPackageMetadataError(packageJsonPath)
    );
}

async function assertInvalidPackageJsonError(projectRoot: string): Promise<void> {
    await assert.rejects(
        async function readPackageMetadata() {
            await readClosestPackageMetadata(pluginModuleUrl(projectRoot));
        },
        SyntaxError
    );
}

async function assertPackageJsonAccessError(projectRoot: string): Promise<void> {
    const sourceFolder = path.join(projectRoot, 'source');

    await fs.chmod(sourceFolder, 0o000);

    try {
        await assert.rejects(
            async function readPackageMetadata() {
                await readClosestPackageMetadata(pathToFileURL(path.join(sourceFolder, 'plugin.js')).href);
            },
            isPackageJsonAccessError
        );
    } finally {
        await fs.chmod(sourceFolder, 0o700);
    }
}

suite('package metadata', function () {
    suite('readClosestPackageMetadata()', function () {
        test('reads metadata from the current package folder', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            } ], async function (projectRoot) {
                const result = await readClosestPackageMetadata(pluginModuleUrl(projectRoot));

                assert.deepStrictEqual(result, {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                });
            });
        });

        test('reads metadata from an ancestor package folder', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            } ], async function (projectRoot) {
                const moduleFilePath = path.join(projectRoot, 'target/build/source/plugin.js');
                const result = await readClosestPackageMetadata(pathToFileURL(moduleFilePath).href);

                assert.deepStrictEqual(result, {
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                });
            });
        });

        test('throws when the nearest package.json is missing required metadata', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: JSON.stringify({ name: 'eslint-plugin-mocha' })
            } ], async function (projectRoot) {
                await assertMissingPackageMetadata(projectRoot);
            });
        });

        test('rethrows invalid package.json parse errors', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: '{'
            } ], async function (projectRoot) {
                await assertInvalidPackageJsonError(projectRoot);
            });
        });

        test('throws when no package.json can be found', async function () {
            await assert.rejects(
                async function readPackageMetadata() {
                    await readClosestPackageMetadata('file:///virtual/project/plugin.js');
                },
                isMissingRootPackageJsonError
            );
        });

        test('rethrows package.json access errors that are not ENOENT', async function () {
            await withTemporaryProject([ {
                path: 'source/package.json',
                contents: JSON.stringify({
                    name: 'eslint-plugin-mocha',
                    version: '11.3.0'
                })
            }, {
                path: 'source/plugin.js',
                contents: ''
            } ], async function (projectRoot) {
                await assertPackageJsonAccessError(projectRoot);
            });
        });

        test('throws when the package module default export is not a record', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: JSON.stringify([ 'eslint-plugin-mocha' ])
            } ], async function (projectRoot) {
                await assertMissingPackageMetadata(projectRoot);
            });
        });

        test('throws when the package name is not a string', async function () {
            await withTemporaryProject([ {
                path: 'package.json',
                contents: JSON.stringify({
                    name: 1,
                    version: '11.3.0'
                })
            } ], async function (projectRoot) {
                await assertMissingPackageMetadata(projectRoot);
            });
        });
    });
});
