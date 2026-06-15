import fs from 'node:fs/promises';
import { createPackageMetadataReader } from './package-metadata-reader.ts';

async function readPackageJson(packageJsonPath: string): Promise<unknown> {
    const textDecoder = new TextDecoder();
    const packageJsonContents = textDecoder.decode(await fs.readFile(packageJsonPath));

    return JSON.parse(packageJsonContents) as unknown;
}

export const readClosestPackageMetadata = createPackageMetadataReader({
    async accessFile(packageJsonPath) {
        await fs.access(packageJsonPath);
    },
    readPackageJson
});
