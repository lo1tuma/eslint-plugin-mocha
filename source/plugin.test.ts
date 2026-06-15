import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import globals from 'globals';
import { camelCase } from 'change-case';
import { suite, test } from 'mocha';
import { readClosestPackageMetadata } from './package-metadata.js';
import plugin from './plugin.js';

const { pathname: currentFolderName } = new URL('.', import.meta.url);

const rulesDir = path.join(currentFolderName, './rules/');
const sourceRulesDir = path.join(currentFolderName, '../../../source/rules/');
const documentationDir = path.join(currentFolderName, '../../../documentation/rules/');
type PluginRuleName = keyof typeof plugin.rules;
type PluginRule = Readonly<(typeof plugin.rules)[PluginRuleName]>;
type RecommendedRuleDecision = Readonly<NonNullable<typeof plugin.configs.recommended.rules>[string]>;

async function importModuleExports(filePath: string): Promise<Readonly<Record<string, unknown>>> {
    return await import(filePath) as Readonly<Record<string, unknown>>;
}

function sourceRuleFileName(file: string): readonly string[] {
    return !file.endsWith('.test.ts') && file.endsWith('.ts')
        ? [ `${path.basename(file, '.ts')}.js` ]
        : [];
}

async function determineSourceRuleFiles(): Promise<ReadonlySet<string>> {
    const knownSourceRuleFiles = await fs.promises.readdir(sourceRulesDir);

    return new Set(knownSourceRuleFiles.flatMap(sourceRuleFileName));
}

function isGeneratedRuleFile(file: string, sourceRuleFiles: ReadonlySet<string>): boolean {
    return !file.endsWith('.test.js') && file.endsWith('.js') && sourceRuleFiles.has(file);
}

async function isPublicRuleFile(file: string): Promise<boolean> {
    const importedRuleModule = await importModuleExports(path.join(rulesDir, file));
    const ruleName = path.basename(file, '.js');

    return importedRuleModule[`${camelCase(ruleName)}Rule`] !== undefined;
}

async function determineAllRuleFiles(): Promise<string[]> {
    const sourceRuleFiles = await determineSourceRuleFiles();
    const knownRuleFiles = await fs.promises.readdir(rulesDir);
    const publicRuleFiles: string[] = [];

    for (const file of knownRuleFiles) {
        if (isGeneratedRuleFile(file, sourceRuleFiles) && await isPublicRuleFile(file)) {
            publicRuleFiles.push(file);
        }
    }

    return publicRuleFiles;
}

async function determineAllDocumentationFiles(): Promise<string[]> {
    const documentationFiles = await fs.promises.readdir(documentationDir);
    const documentationFilesWithoutReadme = documentationFiles.filter(function (file) {
        return file !== 'README.md';
    });

    if (documentationFilesWithoutReadme.length === 0) {
        throw new Error('Failed to read documentation folder');
    }

    return documentationFilesWithoutReadme;
}

function selectAllRuleDecisions(allRules: NonNullable<typeof plugin.configs.all.rules>): Record<string, unknown> {
    return {
        'mocha/consistent-structure': allRules['mocha/consistent-structure'],
        'mocha/handle-done-callback': allRules['mocha/handle-done-callback'],
        'mocha/limit-retries': allRules['mocha/limit-retries'],
        'mocha/limit-slow': allRules['mocha/limit-slow'],
        'mocha/limit-timeout': allRules['mocha/limit-timeout'],
        'mocha/max-top-level-suites': allRules['mocha/max-top-level-suites'],
        'mocha/no-async-and-done': allRules['mocha/no-async-and-done'],
        'mocha/no-async-in-sync-tests': allRules['mocha/no-async-in-sync-tests'],
        'mocha/no-async-suite': allRules['mocha/no-async-suite'],
        'mocha/no-code-after-done': allRules['mocha/no-code-after-done'],
        'mocha/no-conditional-tests': allRules['mocha/no-conditional-tests'],
        'mocha/no-done-twice': allRules['mocha/no-done-twice'],
        'mocha/no-exclusive-tests': allRules['mocha/no-exclusive-tests'],
        'mocha/no-exports': allRules['mocha/no-exports'],
        'mocha/no-top-level-tests': allRules['mocha/no-top-level-tests'],
        'mocha/no-hooks': allRules['mocha/no-hooks'],
        'mocha/no-hooks-for-single-child': allRules['mocha/no-hooks-for-single-child'],
        'mocha/no-identical-title': allRules['mocha/no-identical-title'],
        'mocha/no-mocha-arrows': allRules['mocha/no-mocha-arrows'],
        'mocha/no-nested-suites': allRules['mocha/no-nested-suites'],
        'mocha/no-nested-tests': allRules['mocha/no-nested-tests'],
        'mocha/no-pending-tests': allRules['mocha/no-pending-tests'],
        'mocha/no-return-and-done': allRules['mocha/no-return-and-done'],
        'mocha/no-return-from-async': allRules['mocha/no-return-from-async'],
        'mocha/no-setup-in-suite': allRules['mocha/no-setup-in-suite'],
        'mocha/no-synchronous-tests': allRules['mocha/no-synchronous-tests'],
        'mocha/no-root-hooks': allRules['mocha/no-root-hooks'],
        'mocha/prefer-arrow-callback': allRules['mocha/prefer-arrow-callback'],
        'mocha/consistent-spacing-between-blocks': allRules['mocha/consistent-spacing-between-blocks'],
        'mocha/consistent-interface': allRules['mocha/consistent-interface'],
        'mocha/valid-suite-title': allRules['mocha/valid-suite-title'],
        'mocha/valid-test-title': allRules['mocha/valid-test-title'],
        'mocha/no-empty-title': allRules['mocha/no-empty-title']
    };
}

function isEnabledRuleDecision(decision: RecommendedRuleDecision | undefined): boolean {
    return decision !== undefined &&
        decision !== 'off' &&
        (!Array.isArray(decision) || decision[0] !== 'off');
}

function assertNonEmptyString(value: unknown): void {
    assert.strictEqual(typeof value, 'string');
    assert.notStrictEqual((value as string).length, 0);
}

function readRuleDocumentationUrl(ruleName: string, rule: PluginRule): string {
    const ruleDocumentationUrl = rule.meta?.docs?.url;

    if (ruleDocumentationUrl === undefined) {
        throw new Error(`Expected documentation URL for rule "${ruleName}".`);
    }

    return ruleDocumentationUrl;
}

function assertRuleMessages(rule: PluginRule): void {
    for (const message of Object.values(rule.meta?.messages ?? {})) {
        assertNonEmptyString(message);
    }
}

function assertRuleMetadata(ruleName: string, rule: PluginRule): void {
    assertNonEmptyString(rule.meta?.type);
    assertNonEmptyString(rule.meta?.docs?.description);
    const ruleDocumentationUrl = readRuleDocumentationUrl(ruleName, rule);

    assert.strictEqual(
        ruleDocumentationUrl.endsWith(`/documentation/rules/${ruleName}.md`),
        true
    );

    assertRuleMessages(rule);
}

suite('eslint-plugin-mocha', function () {
    test('should expose plugin metadata', async function () {
        assert.deepStrictEqual(plugin.meta, await readClosestPackageMetadata(import.meta.url));
    });

    test('should expose all rules', async function () {
        const ruleFiles = await determineAllRuleFiles();

        for (const file of ruleFiles) {
            const ruleName = path.basename(file, '.js');
            assert.ok(Object.hasOwn(plugin.rules, ruleName));
            const importedRuleModule = await importModuleExports(path.join(rulesDir, file));
            const importedRule = importedRuleModule[`${camelCase(ruleName)}Rule`];

            assert.notStrictEqual(importedRule, undefined);
            assert.strictEqual(plugin.rules[ruleName], importedRule);
        }
    });

    test('should declare all rules as js-only', function () {
        for (const rule of Object.values(plugin.rules)) {
            assert.deepStrictEqual(rule.meta?.languages, [ 'js/js' ]);
        }
    });

    test('should expose non-empty rule metadata', function () {
        for (const [ ruleName, rule ] of Object.entries(plugin.rules)) {
            assertRuleMetadata(ruleName, rule);
        }
    });

    suite('documentation', function () {
        test('should have each rule documented', async function () {
            const ruleFiles = await determineAllRuleFiles();
            const documentationFiles = await determineAllDocumentationFiles();

            for (const file of ruleFiles) {
                const ruleName = path.basename(file, '.js');
                const expectedDocumentationFileName = `${ruleName}.md`;

                assert.strictEqual(documentationFiles.includes(expectedDocumentationFileName), true);
            }
        });
    });

    suite('configs', function () {
        test('should expose itself in flat configs', function () {
            assert.strictEqual(plugin.configs.all.plugins.mocha, plugin);
            assert.strictEqual(plugin.configs.recommended.plugins.mocha, plugin);
        });

        test('should expose the expected flat config metadata', function () {
            assert.strictEqual(plugin.configs.all.name, 'mocha/all');
            assert.strictEqual(plugin.configs.recommended.name, 'mocha/recommended');
            assert.strictEqual(plugin.configs.all.languageOptions?.globals, globals.mocha);
            assert.strictEqual(plugin.configs.recommended.languageOptions?.globals, globals.mocha);
        });

        test('should configure the all config as intended', function () {
            const { rules: allRules } = plugin.configs.all;

            assert.notStrictEqual(allRules, undefined);
            assert.deepStrictEqual(
                selectAllRuleDecisions(allRules as NonNullable<typeof plugin.configs.all.rules>),
                {
                    'mocha/consistent-structure': [ 'error', {
                        order: 'hooks-tests-suites',
                        disallowDuplicateHooks: true,
                        disallowMixedTestsAndSuites: true
                    } ],
                    'mocha/handle-done-callback': 'error',
                    'mocha/limit-retries': 'error',
                    'mocha/limit-slow': 'error',
                    'mocha/limit-timeout': 'error',
                    'mocha/max-top-level-suites': 'error',
                    'mocha/no-async-and-done': 'error',
                    'mocha/no-async-in-sync-tests': 'error',
                    'mocha/no-async-suite': 'error',
                    'mocha/no-code-after-done': 'error',
                    'mocha/no-conditional-tests': 'error',
                    'mocha/no-done-twice': 'error',
                    'mocha/no-exclusive-tests': 'error',
                    'mocha/no-exports': 'error',
                    'mocha/no-top-level-tests': 'error',
                    'mocha/no-hooks': 'error',
                    'mocha/no-hooks-for-single-child': 'error',
                    'mocha/no-identical-title': 'error',
                    'mocha/no-mocha-arrows': 'error',
                    'mocha/no-nested-suites': 'error',
                    'mocha/no-nested-tests': 'error',
                    'mocha/no-pending-tests': 'error',
                    'mocha/no-return-and-done': 'error',
                    'mocha/no-return-from-async': 'error',
                    'mocha/no-setup-in-suite': 'error',
                    'mocha/no-synchronous-tests': 'error',
                    'mocha/no-root-hooks': 'error',
                    'mocha/prefer-arrow-callback': 'error',
                    'mocha/consistent-spacing-between-blocks': 'error',
                    'mocha/consistent-interface': [ 'error', { interface: 'BDD' } ],
                    'mocha/valid-suite-title': 'error',
                    'mocha/valid-test-title': 'error',
                    'mocha/no-empty-title': 'error'
                }
            );
        });

        test('should configure the recommended config as intended', function () {
            const { rules: recommendedRules } = plugin.configs.recommended;

            assert.notStrictEqual(recommendedRules, undefined);
            assert.deepStrictEqual(
                recommendedRules,
                {
                    'mocha/consistent-structure': [ 'error', { disallowDuplicateHooks: true } ],
                    'mocha/handle-done-callback': 'error',
                    'mocha/limit-retries': 'off',
                    'mocha/limit-slow': 'off',
                    'mocha/limit-timeout': 'off',
                    'mocha/max-top-level-suites': 'off',
                    'mocha/no-async-and-done': 'error',
                    'mocha/no-async-in-sync-tests': 'error',
                    'mocha/no-async-suite': 'error',
                    'mocha/no-code-after-done': 'error',
                    'mocha/no-conditional-tests': 'error',
                    'mocha/no-done-twice': 'error',
                    'mocha/no-exclusive-tests': 'warn',
                    'mocha/no-exports': 'error',
                    'mocha/no-top-level-tests': 'error',
                    'mocha/no-hooks': 'off',
                    'mocha/no-hooks-for-single-child': 'off',
                    'mocha/no-identical-title': 'error',
                    'mocha/no-mocha-arrows': 'error',
                    'mocha/no-nested-suites': 'off',
                    'mocha/no-nested-tests': 'error',
                    'mocha/no-pending-tests': 'warn',
                    'mocha/no-return-and-done': 'error',
                    'mocha/no-return-from-async': 'off',
                    'mocha/no-setup-in-suite': 'off',
                    'mocha/no-synchronous-tests': 'off',
                    'mocha/no-root-hooks': 'off',
                    'mocha/prefer-arrow-callback': 'off',
                    'mocha/valid-suite-title': 'off',
                    'mocha/valid-test-title': 'off',
                    'mocha/no-empty-title': 'error',
                    'mocha/consistent-spacing-between-blocks': 'off',
                    'mocha/consistent-interface': 'off'
                }
            );
        });

        test('should align rule metadata with the recommended config', function () {
            const { rules: recommendedRules } = plugin.configs.recommended;

            assert.notStrictEqual(recommendedRules, undefined);

            for (const [ ruleName, rule ] of Object.entries(plugin.rules)) {
                const fullRuleName = `mocha/${ruleName}`;

                assert.strictEqual(
                    rule.meta?.docs?.recommended ?? false,
                    isEnabledRuleDecision(recommendedRules?.[fullRuleName])
                );
            }
        });
    });
});
