'use strict';

var expect = require('chai').expect,
    fs = require('fs'),
    path = require('path'),
    rulesDir = path.join(__dirname, '../lib/rules/'),
    documentationDir = path.join(__dirname, '../docs/rules/'),
    plugin = require('..');

describe('eslint-plugin-mocha', function () {
    var ruleFiles;

    before(function (done) {
        fs.readdir(rulesDir, function (error, files) {
            ruleFiles = files;
            done(error);
        });
    });

    it('should expose all rules', function () {
        ruleFiles.forEach(function (file) {
            var ruleName = path.basename(file, '.js');

            expect(plugin).to.have.deep.property('rules.' + ruleName)
                .that.equals(require(rulesDir + ruleName));
        });
    });

    describe('documentation', function () {
        var documentationFiles;

        before(function (done) {
            fs.readdir(documentationDir, function (error, files) {
                documentationFiles = files;
                done(error);
            });
        });

        it('should have each rule documented', function () {
            ruleFiles.forEach(function (file) {
                var ruleName = path.basename(file, '.js'),
                    expectedDocumentationFileName = ruleName + '.md';

                expect(documentationFiles).to.contain(expectedDocumentationFileName);
            });
        });
    });
});
