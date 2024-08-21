const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const rulesDir = path.join(__dirname, '../lib/rules/');
const documentationDir = path.join(__dirname, '../docs/rules/');
const plugin = require('..');

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

        ruleFiles.forEach(function (file) {
            const ruleName = path.basename(file, '.js');

            assert.strictEqual(plugin.rules[ruleName], require(rulesDir + ruleName));
        });
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
