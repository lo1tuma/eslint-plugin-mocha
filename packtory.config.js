// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

// eslint-disable-next-line node/no-process-env -- needed
const npmToken = process.env.NPM_TOKEN;

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, './package.json'), { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    if (npmToken === undefined) {
        throw new Error('Missing NPM_TOKEN environment variable');
    }

    return {
        registrySettings: { token: npmToken },
        packages: [
            {
                name: 'eslint-plugin-mocha',
                versioning: {
                    automatic: false,
                    version: '11.0.0'
                },
                sourcesFolder,
                mainPackageJson: packageJson,
                includeSourceMapFiles: false,
                additionalPackageJsonAttributes: {
                    license: packageJson.license,
                    repository: packageJson.repository,
                    author: packageJson.author,
                    contributors: packageJson.contributors,
                    description: packageJson.description,
                    keywords: packageJson.keywords
                },
                entryPoints: [{ js: 'plugin.js' }],
                additionalFiles: [
                    {
                        sourceFilePath: path.join(projectFolder, 'README.md'),
                        targetFilePath: 'readme.md'
                    },
                    {
                        sourceFilePath: path.join(projectFolder, 'LICENSE'),
                        targetFilePath: 'LICENSE'
                    }
                ]
            }
        ]
    };
}
