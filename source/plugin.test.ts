import { camelCase } from 'change-case';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import plugin from './plugin.js';

const { pathname: currentFolderName } = new URL('.', import.meta.url);

const rulesDir = path.join(currentFolderName, './rules/');
const documentationDir = path.join(currentFolderName, '../../../docs/rules/');

async function determineAllRuleFiles(): Promise<string[]> {
    const ruleFiles = await fs.promises.readdir(rulesDir);
    if (rulesDir.length === 0) {
        throw new Error('Failed to read rules folder');
    }
    return ruleFiles.filter((file) => {
        return !file.endsWith('.test.js') && file.endsWith('.js');
    });
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

describe('eslint-plugin-mocha', function () {
    it('should expose all rules', async function () {
        const ruleFiles = await determineAllRuleFiles();

        for (const file of ruleFiles) {
            const ruleName = path.basename(file, '.js');
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ok
            const importedRuleModule = await import(path.join(rulesDir, file));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- ok
            const importedRule = importedRuleModule[`${camelCase(ruleName)}Rule`];

            assert.notStrictEqual(importedRule, undefined);
            assert.strictEqual(plugin.rules?.[ruleName], importedRule);
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
});
