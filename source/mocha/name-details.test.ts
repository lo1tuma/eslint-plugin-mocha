import { Linter, type Rule, type SourceCode } from 'eslint';
import assert from 'node:assert';
import { extractMemberExpressionPath } from '../ast/member-expression.js';
import { buildAllNameDetailsWithVariants, reformatLastPathSegmentWithCallExpressions } from './name-details.js';

function prefixPending(name: string): string {
    return `x${name}`;
}

const prefixedFoo = prefixPending('foo');

function readExpression(code: string): { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } {
    const linter = new Linter();
    let result: { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; } | null = null;

    const testRule: Rule.RuleModule = {
        create(ruleContext) {
            return {
                Program() {
                    const [firstStatement] = ruleContext.sourceCode.ast.body;
                    assert.notStrictEqual(firstStatement, undefined);
                    assert.strictEqual(firstStatement?.type, 'ExpressionStatement');

                    result = {
                        sourceCode: ruleContext.sourceCode,
                        expression: firstStatement.expression as unknown as Readonly<Rule.Node>
                    };
                }
            };
        }
    };

    const messages = linter.verify(code, {
        plugins: { 'test-plugin': { rules: { 'test-rule': testRule } } },
        languageOptions: { ecmaVersion: 2020, sourceType: 'script' },
        rules: { 'test-plugin/test-rule': 'error' }
    });
    assert.deepStrictEqual(messages, []);
    assert.notStrictEqual(result, null);

    return result as { sourceCode: Readonly<SourceCode>; expression: Readonly<Rule.Node>; };
}

describe('mocha names', function () {
    describe('buildAllNameDetailsWithVariants()', function () {
        it('returns an empty list if an empty list is given', function () {
            const nameDetailsList = buildAllNameDetailsWithVariants([]);

            assert.deepStrictEqual(nameDetailsList, []);
        });

        it('returns the name details for a suite itself and all its variants', function () {
            const nameDetailsList = buildAllNameDetailsWithVariants([{
                path: ['foo'],
                interface: 'BDD',
                type: 'suite',
                modifier: null,
                config: null
            }]);

            assert.deepStrictEqual(nameDetailsList, [
                {
                    config: null,
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()'
                    ],
                    path: [
                        'foo'
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()'
                    ],
                    path: [
                        'foo',
                        'skip'
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        `${prefixedFoo}()`
                    ],
                    path: [
                        prefixedFoo
                    ],
                    type: 'suite'
                },
                {
                    config: null,
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()'
                    ],
                    path: [
                        'foo',
                        'only'
                    ],
                    type: 'suite'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        `${prefixedFoo}()`,
                        'timeout()'
                    ],
                    path: [
                        prefixedFoo,
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'timeout',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'timeout()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'timeout'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        `${prefixedFoo}()`,
                        'slow()'
                    ],
                    path: [
                        prefixedFoo,
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'slow',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'slow()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'slow'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: null,
                    normalizedPath: [
                        'foo()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        'foo',
                        'skip()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'skip',
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'pending',
                    normalizedPath: [
                        `${prefixedFoo}()`,
                        'retries()'
                    ],
                    path: [
                        prefixedFoo,
                        'retries'
                    ],
                    type: 'config'
                },
                {
                    config: 'retries',
                    interface: 'BDD',
                    modifier: 'exclusive',
                    normalizedPath: [
                        'foo',
                        'only()',
                        'retries()'
                    ],
                    path: [
                        'foo',
                        'only',
                        'retries'
                    ],
                    type: 'config'
                }
            ]);
        });
    });

    describe('reformatLastPathSegmentWithCallExpressions()', function () {
        it('returns dynamic paths unchanged', function () {
            const { sourceCode, expression } = readExpression('foo[bar];');
            const dynamicPath = extractMemberExpressionPath(sourceCode, expression);

            const result = reformatLastPathSegmentWithCallExpressions(dynamicPath, 2);

            assert.strictEqual(result, dynamicPath);
        });
    });
});
