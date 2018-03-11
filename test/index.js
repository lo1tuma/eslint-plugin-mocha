'use strict';

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const rulesDir = path.join(__dirname, '../lib/rules/');
const documentationDir = path.join(__dirname, '../docs/rules/');
const plugin = require('..');

describe('eslint-plugin-mocha', function () {
    let ruleFiles;

    before(function (done) {
        fs.readdir(rulesDir, function (error, files) {
            ruleFiles = files;
            done(error);
        });
    });

    it('should expose all rules', function () {
        ruleFiles.forEach(function (file) {
            const ruleName = path.basename(file, '.js');

            expect(plugin).to.have.nested.property(`rules.${ruleName}`)
                .that.equals(require(rulesDir + ruleName));
        });
    });

    describe('documentation', function () {
        let documentationFiles;
        let documentationIndex;

        before(function (done) {
            fs.readdir(documentationDir, function (readDirError, files) {
                if (readDirError) {
                    done(readDirError);
                    return;
                }

                documentationFiles = files.filter(function (file) {
                    return file !== 'README.md';
                });

                fs.readFile(`${documentationDir }README.md`, function (error, data) {
                    documentationIndex = data.toString();
                    done(error);
                });
            });
        });

        it('should have each rule documented', function () {
            ruleFiles.forEach(function (file) {
                const ruleName = path.basename(file, '.js');
                const expectedDocumentationFileName = `${ruleName }.md`;

                expect(documentationFiles).to.contain(expectedDocumentationFileName);
            });
        });

        it('should be linked in the documentation index', function () {
            documentationFiles.forEach(function (file) {
                const ruleName = path.basename(file, '.md');
                const expectedLink = `* [${ ruleName }](${ file })`;

                expect(documentationIndex).to.contain(expectedLink);
            });
        });
    });
});
