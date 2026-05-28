import fs from 'node:fs/promises';
import { createPackageMetadataReader } from './package-metadata-reader.js';

async function readPackageJson(packageJsonPath: string): Promise<unknown> {
    const packageJsonContents = new TextDecoder().decode(await fs.readFile(packageJsonPath));

    return JSON.parse(packageJsonContents) as unknown;
}

export const readClosestPackageMetadata = createPackageMetadataReader({
    async accessFile(packageJsonPath) {
        await fs.access(packageJsonPath);
    },
    readPackageJson
});
