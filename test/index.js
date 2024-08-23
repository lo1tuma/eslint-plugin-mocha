import { camelCase } from 'change-case';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import plugin from '../index.js';

const { pathname: currentFolderName } = new URL('.', import.meta.url);

const rulesDir = path.join(currentFolderName, '../lib/rules/');
const documentationDir = path.join(currentFolderName, '../docs/rules/');

async function determineAllRuleFiles() {
    const ruleFiles = await fs.promises.readdir(rulesDir);
    if (rulesDir.length === 0) {
        throw new Error('Failed to read rules folder');
    }
    return ruleFiles;
}

async function determineAllDocumentationFiles() {
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
            const importedRuleModule = await import(path.join(rulesDir, file));
            const importedRule = importedRuleModule[`${camelCase(ruleName)}Rule`];

            assert.notStrictEqual(importedRule, undefined);
            assert.strictEqual(plugin.rules[ruleName], importedRule);
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
