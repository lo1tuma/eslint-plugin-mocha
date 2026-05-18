import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from './record.js';

export type PackageMetadata = {
    name: string;
    version: string;
};

function parsePackageMetadata(packageJsonPath: string, packageJsonContent: string): Readonly<PackageMetadata> {
    const packageJson = JSON.parse(packageJsonContent) as unknown;

    if (
        isRecord(packageJson) &&
        typeof packageJson.name === 'string' &&
        typeof packageJson.version === 'string'
    ) {
        return {
            name: packageJson.name,
            version: packageJson.version
        };
    }

    throw new Error(`Missing package name or version in ${packageJsonPath}`);
}

function determineParentFolder(currentFolder: string): string {
    const parentFolder = path.dirname(currentFolder);

    if (parentFolder === currentFolder) {
        throw new Error(`Failed to find package.json for ${currentFolder}`);
    }

    return parentFolder;
}

function isEnoentError(error: unknown): boolean {
    return isRecord(error) && error.code === 'ENOENT';
}

function readPackageMetadata(packageJsonPath: string): Readonly<PackageMetadata> | undefined {
    try {
        // eslint-disable-next-line node/no-sync -- plugin metadata must be available during module initialization
        const packageJsonContent = fs.readFileSync(packageJsonPath, { encoding: 'utf8' });

        return parsePackageMetadata(packageJsonPath, packageJsonContent);
    } catch (error) {
        if (isEnoentError(error)) {
            return undefined;
        }

        throw error;
    }
}

export function readClosestPackageMetadata(currentModuleUrl: string): Readonly<PackageMetadata> {
    let currentFolder = path.dirname(fileURLToPath(currentModuleUrl));

    for (;;) {
        const packageJsonPath = path.join(currentFolder, 'package.json');
        const packageMetadata = readPackageMetadata(packageJsonPath);

        if (packageMetadata !== undefined) {
            return packageMetadata;
        }

        currentFolder = determineParentFolder(currentFolder);
    }
}
