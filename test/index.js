'use strict';

var expect = require('chai').expect,
    fs = require('fs'),
    path = require('path'),
    rulesDir = path.join(__dirname, '../lib/rules/'),
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
});
