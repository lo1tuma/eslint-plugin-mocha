// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

async function readPackageInfo() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    return JSON.parse(packageJsonContent);
}

function registrySettings() {
    return {
        auth: { type: 'npm-oidc', provider: 'github-actions' }
    };
}

function commonPackageSettings(packageInfo) {
    return {
        sourcesFolder,
        mainPackageJson: packageInfo,
        includeSourceMapFiles: false,
        publishSettings: {
            access: 'public',
            provenance: { type: 'auto' }
        },
        additionalPackageJsonAttributes: {
            author: packageInfo.author,
            contributors: packageInfo.contributors,
            description: packageInfo.description,
            keywords: packageInfo.keywords,
            license: packageInfo.license,
            repository: packageInfo.repository
        }
    };
}

function releasePullRequestSettings() {
    return {
        branch: 'release/eslint-plugin-mocha',
        body: 'Updates changelogs for the next `eslint-plugin-mocha` release.',
        githubActionsCi: {
            trigger: 'workflow-dispatch',
            workflowFile: 'ci.yml',
            requiredStatusContexts: [ 'Node 22', 'Node 24', 'Node 26' ]
        }
    };
}

function mochaPluginPackage() {
    return {
        name: 'eslint-plugin-mocha',
        versioning: {
            automatic: false,
            source: 'pull-request-labels'
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
                targetFilePath: 'README.md'
            },
            {
                sourceFilePath: path.join(projectFolder, 'LICENSE'),
                targetFilePath: 'LICENSE'
            }
        ]
    };
}

/** @returns {Promise<import('@packtory/cli').PacktoryConfig & Record<string, unknown>>} */
export async function buildConfig() {
    const packageInfo = await readPackageInfo();

    return {
        registrySettings: registrySettings(),
        changelog: {
            packageTagFormat: '{version}',
            outputs: [
                { kind: 'repository-file', path: 'CHANGELOG.md' },
                { kind: 'github-release' }
            ]
        },
        checks: {
            noDevDependencyImports: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            uniqueTargetPaths: { enabled: true }
        },
        commonPackageSettings: commonPackageSettings(packageInfo),
        releasePullRequest: releasePullRequestSettings(),
        packages: [
            mochaPluginPackage()
        ]
    };
}
