import { Linter } from 'eslint';
import assert from 'node:assert';
import { findGlobalReferencesByName } from '../../../lib/ast/find-global-references.js';

function findReferenceNames(code, names, { globals = {} } = {}) {
    const linter = new Linter();
    let foundResolvedReferences = null;

    const testLintRule = {
        create(ruleContext) {
            return {
                Program() {
                    const references = findGlobalReferencesByName(ruleContext, names);
                    foundResolvedReferences = references.map((reference) => {
                        return {
                            path: reference.path,
                            resolvedPath: reference.resolvedPath
                        };
                    });
                }
            };
        }
    };

    const results = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testLintRule } } },
        languageOptions: { ecmaVersion: 2018, sourceType: 'script', globals },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    if (results.length > 0) {
        throw new Error('Expect zero results');
    }

    return foundResolvedReferences;
}

describe('findGlobalReferencesByName()', function () {
    it('returns an empty array if no match was found', function () {
        const foundResolvedReferences = findReferenceNames('bar;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('returns an empty array if a matched identifier was found but it it refers to a local definition', function () {
        const foundResolvedReferences = findReferenceNames('var foo;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, []);
    });

    it('finds a matching reference when there is no resolved globals', function () {
        const foundResolvedReferences = findReferenceNames('foo;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [{ path: ['foo'], resolvedPath: ['foo'] }]);
    });

    it('finds a matching reference when used in a call expression', function () {
        const foundResolvedReferences = findReferenceNames('foo();', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [{ path: ['foo()'], resolvedPath: ['foo()'] }]);
    });

    it('finds a matching reference when used in a member expression', function () {
        const foundResolvedReferences = findReferenceNames('foo.bar;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [{ path: ['foo', 'bar'], resolvedPath: ['foo', 'bar'] }]);
    });

    it('finds a matching reference when used in an assignment expression', function () {
        const foundResolvedReferences = findReferenceNames('var bar = foo;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [{ path: ['foo'], resolvedPath: ['foo'] }]);
    });

    it('finds a matching reference when there is a resolved global', function () {
        const foundResolvedReferences = findReferenceNames(
            'foo',
            [{ path: ['foo'] }],
            { globals: { foo: false } }
        );

        assert.deepStrictEqual(foundResolvedReferences, [{ path: ['foo'], resolvedPath: ['foo'] }]);
    });

    it('finds multiple matching references for the same name', function () {
        const foundResolvedReferences = findReferenceNames('foo(); foo.bar;', [{ path: ['foo'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [
            { path: ['foo()'], resolvedPath: ['foo()'] },
            { path: ['foo', 'bar'], resolvedPath: ['foo', 'bar'] }
        ]);
    });

    it('finds multiple matching references of different names', function () {
        const foundResolvedReferences = findReferenceNames('foo; bar;', [{ path: ['foo'] }, { path: ['bar'] }]);

        assert.deepStrictEqual(foundResolvedReferences, [
            { path: ['foo'], resolvedPath: ['foo'] },
            { path: ['bar'], resolvedPath: ['bar'] }
        ]);
    });
});
