// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');
const dryRunTokenPlaceholder = 'dry-run-placeholder';

// eslint-disable-next-line node/no-process-env -- publish auth comes from the environment
const npmToken = process.env.NPM_TOKEN;

function isLivePublishInvocation(commandLineArguments) {
    return (
        commandLineArguments.includes('publish') &&
        commandLineArguments.includes('--no-dry-run')
    );
}

if (npmToken === undefined && isLivePublishInvocation(process.argv)) {
    throw new Error('Missing NPM_TOKEN environment variable');
}

const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), {
    encoding: 'utf8'
});
const packageJson = JSON.parse(packageJsonContent);

export const config = {
    registrySettings: {
        auth: {
            publish: {
                type: 'bearer-token',
                token: npmToken ?? dryRunTokenPlaceholder
            },
            metadata: npmToken === undefined ? 'anonymous' : 'auto'
        }
    },
    checks: {
        noDevDependencyImports: {
            enabled: true
        },
        requiredFiles: {
            enabled: true,
            files: ['LICENSE', 'readme.md']
        },
        uniqueTargetPaths: {
            enabled: true
        }
    },
    commonPackageSettings: {
        sourcesFolder,
        mainPackageJson: packageJson,
        includeSourceMapFiles: false,
        publishSettings: {
            access: 'public'
        },
        additionalPackageJsonAttributes: {
            license: packageJson.license,
            repository: packageJson.repository,
            author: packageJson.author,
            contributors: packageJson.contributors,
            description: packageJson.description,
            keywords: packageJson.keywords
        }
    },
    packages: [
        {
            name: 'eslint-plugin-mocha',
            versioning: {
                automatic: false,
                version: '11.3.0'
            },
            roots: {
                main: {
                    js: 'plugin.js',
                    declarationFile: 'plugin.d.ts'
                }
            },
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
