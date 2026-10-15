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
        authentication: { type: 'npm-open-identity-connect', provider: 'github-actions' }
    };
}

function commonPackageSettings(packageInfo) {
    return {
        sourcesFolder,
        mainPackageManifest: packageInfo,
        deadCodeElimination: { enabled: true },
        includeSourceMapFiles: false,
        publishSettings: {
            access: 'public',
            provenance: { type: 'automatic' }
        },
        additionalPackageManifestAttributes: {
            author: packageInfo.author,
            contributors: packageInfo.contributors,
            description: packageInfo.description,
            engines: packageInfo.engines,
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
        githubActionsContinuousIntegration: {
            trigger: 'workflow-dispatch',
            workflowFile: 'ci.yml',
            requiredStatusContexts: [
                'Node 22',
                'Node 24',
                'Node 26',
                'Package checks',
                'Workflow security analysis',
                'Release PR policy',
                'Mutation testing'
            ]
        }
    };
}

/**
@returns {NonNullable<import('@packtory/cli').PacktoryConfiguration['changelog']>}
*/
function createChangelogSettings() {
    return {
        pullRequestLog: {
            ignoredLabels: [ 'release' ],
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update dependency (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: '$<prefix>Update dependency $<dependency> from $<from> to $<to>'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update (?:dependency )?`?(?<dependency>.+?)`? to `?(?<to>[^` ]+)`?$',
                    replace: '$<prefix>Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?(?<dependency>Lock file maintenance|Update (?:.+ dependencies|eslint))$',
                    replace: '$<prefix>$<dependency>',
                    collapse: 'same'
                }
            ]
        },
        outputs: [
            { kind: 'repository-file', path: 'CHANGELOG.md' },
            { kind: 'github-release' }
        ]
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
                javaScript: 'plugin.js',
                declarationFile: 'plugin.d.ts'
            }
        },
        additionalFiles: [
            {
                inputFilePath: path.join(projectFolder, 'README.md'),
                targetFilePath: 'README.md'
            },
            {
                inputFilePath: path.join(projectFolder, 'LICENSE'),
                targetFilePath: 'LICENSE'
            }
        ]
    };
}

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfiguration & Record<string, unknown>>}
 */
export async function buildConfiguration() {
    const packageInfo = await readPackageInfo();

    return {
        registrySettings: registrySettings(),
        changelog: createChangelogSettings(),
        checks: {
            typeScriptIntegrity: { enabled: true, declarations: 'all' },
            noDevelopmentDependencyImports: { enabled: true },
            noUnusedBundleDependencies: { enabled: true },
            noDuplicatedFiles: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            uniqueTargetPaths: { enabled: true },
            noUnexposedExecutables: { enabled: true },
            nodeEngineCompatibility: { enabled: true }
        },
        commonPackageSettings: commonPackageSettings(packageInfo),
        releasePullRequest: releasePullRequestSettings(),
        packages: [
            mochaPluginPackage()
        ]
    };
}
