import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRecord } from './record.js';

export type PackageMetadata = {
    readonly name: string;
    readonly version: string;
};

export type PackageMetadataReaderDependencies = {
    readonly accessFile: (packageJsonPath: string) => Promise<void>;
    readonly readPackageJson: (packageJsonPath: string) => Promise<unknown>;
};

function parsePackageMetadata(packageJsonPath: string, packageJson: unknown): Readonly<PackageMetadata> {
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

async function readPackageMetadata(
    packageJsonPath: string,
    dependencies: Readonly<PackageMetadataReaderDependencies>
): Promise<Readonly<PackageMetadata> | undefined> {
    try {
        await dependencies.accessFile(packageJsonPath);
    } catch (error) {
        if (isEnoentError(error)) {
            return undefined;
        }

        throw error;
    }

    const packageJson = await dependencies.readPackageJson(packageJsonPath);

    return parsePackageMetadata(packageJsonPath, packageJson);
}

export function createPackageMetadataReader(
    dependencies: Readonly<PackageMetadataReaderDependencies>
): (currentModuleUrl: string) => Promise<Readonly<PackageMetadata>> {
    return async function readClosestPackageMetadata(currentModuleUrl: string): Promise<Readonly<PackageMetadata>> {
        let currentFolder = path.dirname(fileURLToPath(currentModuleUrl));

        for (;;) {
            const packageJsonPath = path.join(currentFolder, 'package.json');
            const packageMetadata = await readPackageMetadata(packageJsonPath, dependencies);

            if (packageMetadata !== undefined) {
                return packageMetadata;
            }

            currentFolder = determineParentFolder(currentFolder);
        }
    };
}
