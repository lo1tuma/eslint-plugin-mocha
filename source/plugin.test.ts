import { camelCase } from 'change-case';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { readClosestPackageMetadata } from './package-metadata.js';
import plugin from './plugin.js';

const { pathname: currentFolderName } = new URL('.', import.meta.url);

const rulesDir = path.join(currentFolderName, './rules/');
const sourceRulesDir = path.join(currentFolderName, '../../../source/rules/');
const documentationDir = path.join(currentFolderName, '../../../documentation/rules/');

async function importModuleExports(filePath: string): Promise<Readonly<Record<string, unknown>>> {
    return await import(filePath) as Readonly<Record<string, unknown>>;
}

async function determineAllRuleFiles(): Promise<string[]> {
    const sourceRuleFiles = new Set((await fs.promises.readdir(sourceRulesDir)).flatMap((file) => {
        return !file.endsWith('.test.ts') && file.endsWith('.ts')
            ? [`${path.basename(file, '.ts')}.js`]
            : [];
    }));
    const knownRuleFiles = await fs.promises.readdir(rulesDir);
    const ruleFiles = knownRuleFiles.filter((file) => {
        return !file.endsWith('.test.js') && file.endsWith('.js') && sourceRuleFiles.has(file);
    });

    if (rulesDir.length === 0) {
        throw new Error('Failed to read rules folder');
    }

    const publicRuleFiles: string[] = [];

    for (const file of ruleFiles) {
        // Only public rule modules should count here.
        // This keeps the test stable when stale generated files remain after rule moves.
        const importedRuleModule = await importModuleExports(path.join(rulesDir, file));
        const ruleName = path.basename(file, '.js');

        if (importedRuleModule[`${camelCase(ruleName)}Rule`] !== undefined) {
            publicRuleFiles.push(file);
        }
    }

    return publicRuleFiles;
}

async function determineAllDocumentationFiles(): Promise<string[]> {
    const documentationFiles = await fs.promises.readdir(documentationDir);
    const documentationFilesWithoutReadme = documentationFiles.filter((file) => {
        return file !== 'README.md';
    });

    if (documentationFilesWithoutReadme.length === 0) {
        throw new Error('Failed to read documentation folder');
    }

    return documentationFilesWithoutReadme;
}

function selectRecommendedRuleDecisions(
    recommendedRules: NonNullable<typeof plugin.configs.recommended.rules>
): Record<string, unknown> {
    return {
        'mocha/max-top-level-suites': recommendedRules['mocha/max-top-level-suites'],
        'mocha/no-async-in-sync-tests': recommendedRules['mocha/no-async-in-sync-tests'],
        'mocha/no-conditional-tests': recommendedRules['mocha/no-conditional-tests'],
        'mocha/no-setup-in-suite': recommendedRules['mocha/no-setup-in-suite'],
        'mocha/no-root-hooks': recommendedRules['mocha/no-root-hooks'],
        'mocha/consistent-spacing-between-blocks': recommendedRules['mocha/consistent-spacing-between-blocks'],
        'mocha/consistent-interface': recommendedRules['mocha/consistent-interface']
    };
}

describe('eslint-plugin-mocha', function () {
    it('should expose plugin metadata', async function () {
        assert.deepStrictEqual(plugin.meta, await readClosestPackageMetadata(import.meta.url));
    });

    it('should expose all rules', async function () {
        const ruleFiles = await determineAllRuleFiles();

        for (const file of ruleFiles) {
            const ruleName = path.basename(file, '.js');
            assert.ok(ruleName in plugin.rules);
            const importedRuleModule = await importModuleExports(path.join(rulesDir, file));
            const importedRule = importedRuleModule[`${camelCase(ruleName)}Rule`];

            assert.notStrictEqual(importedRule, undefined);
            assert.strictEqual(plugin.rules[ruleName], importedRule);
        }
    });

    it('should declare all rules as js-only', function () {
        for (const rule of Object.values(plugin.rules)) {
            assert.deepStrictEqual(rule.meta?.languages, ['js/js']);
        }
    });

    describe('documentation', function () {
        it('should have each rule documented', async function () {
            const ruleFiles = await determineAllRuleFiles();
            const documentationFiles = await determineAllDocumentationFiles();

            ruleFiles.forEach(function (file) {
                const ruleName = path.basename(file, '.js');
                const expectedDocumentationFileName = `${ruleName}.md`;
                const matchingDocumentationFiles = documentationFiles.filter((documentationFile) => {
                    return documentationFile === expectedDocumentationFileName;
                });

                assert.strictEqual(matchingDocumentationFiles.length, 1);
            });
        });
    });

    describe('configs', function () {
        it('should expose itself in flat configs', function () {
            assert.strictEqual(plugin.configs.all.plugins.mocha, plugin);
            assert.strictEqual(plugin.configs.recommended.plugins.mocha, plugin);
        });

        it('should configure the recommended config as intended', function () {
            const { rules: recommendedRules } = plugin.configs.recommended;

            assert.notStrictEqual(recommendedRules, undefined);
            assert.deepStrictEqual(
                selectRecommendedRuleDecisions(
                    recommendedRules as NonNullable<typeof plugin.configs.recommended.rules>
                ),
                {
                    'mocha/max-top-level-suites': 'off',
                    'mocha/no-async-in-sync-tests': 'error',
                    'mocha/no-conditional-tests': 'error',
                    'mocha/no-setup-in-suite': 'off',
                    'mocha/no-root-hooks': 'off',
                    'mocha/consistent-spacing-between-blocks': 'off',
                    'mocha/consistent-interface': 'off'
                }
            );
        });
    });
});
