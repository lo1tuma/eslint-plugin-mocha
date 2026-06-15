import assert from 'node:assert';
import * as typescriptParser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import { suite, test } from 'mocha';
import { withInterface } from '../mocha-interface-test-cases.js';
import { isRecord } from '../record.js';
import { noAsyncInSyncTestsRule } from './no-async-in-sync-tests.js';

const slowTypedTestTimeout = 30_000;
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const { pathname: projectRoot } = new URL('../../', import.meta.url);
const { pathname: typescriptFilename } = new URL('./no-async-in-sync-tests.fixture.ts', import.meta.url);
const allowSetTimeoutOption = { allowedAsyncMethods: [ 'setTimeout' ] };
const defaultAllowedAsyncMethods = [
    'setImmediate',
    'setInterval',
    'setTimeout',
    'queueMicrotask',
    'process.nextTick',
    'global.setImmediate',
    'global.setInterval',
    'global.setTimeout',
    'global.queueMicrotask',
    'globalThis.setImmediate',
    'globalThis.setInterval',
    'globalThis.setTimeout',
    'globalThis.queueMicrotask',
    'window.setInterval',
    'window.setTimeout',
    'window.queueMicrotask'
] as const;
const typescriptLanguageOptions = {
    parser: typescriptParser,
    parserOptions: {
        projectService: { allowDefaultProject: [ 'source/rules/*.fixture.ts' ] },
        tsconfigRootDir: projectRoot
    },
    sourceType: 'module'
} as const;
type RuleTesterTestFunction = (testName: string, callback: () => void) => unknown;
type TimedTest = {
    timeout: (duration: number) => void;
};

function getRuleTesterTestFunction(testFn: typeof RuleTester.it): RuleTesterTestFunction {
    if (testFn === null) {
        throw new Error('Expected RuleTester.it to be available.');
    }

    return testFn;
}

const defaultIt = getRuleTesterTestFunction(RuleTester.it);
const defaultItOnly = getRuleTesterTestFunction(RuleTester.itOnly);

function hasTimeoutMethod(value: unknown): value is TimedTest {
    return isRecord(value) && typeof value.timeout === 'function';
}

function withLongerTimeout(testFn: RuleTesterTestFunction): RuleTesterTestFunction {
    return function runWithLongerTimeout(testName, callback): void {
        const testCase = testFn(testName, callback);

        if (hasTimeoutMethod(testCase)) {
            testCase.timeout(slowTypedTestTimeout);
        }
    };
}

function verifyCodeWithParserServices(sourceText: string, parserServices: unknown): readonly Linter.LintMessage[] {
    const linter = new Linter({ configType: 'flat' });

    return linter.verify(sourceText, [ {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            parser: {
                parseForESLint(code: string, options: Readonly<Record<string, unknown>>) {
                    const parsed = typescriptParser.parseForESLint(code, {
                        ...options,
                        comment: true,
                        filePath: typescriptFilename,
                        loc: true,
                        range: true,
                        sourceType: 'script',
                        tokens: true
                    });

                    return {
                        ast: parsed.ast,
                        scopeManager: parsed.scopeManager,
                        services: parserServices
                    };
                }
            }
        },
        plugins: {
            mocha: {
                rules: {
                    'no-async-in-sync-tests': noAsyncInSyncTestsRule
                }
            }
        },
        rules: {
            'mocha/no-async-in-sync-tests': 'error'
        }
    } ]);
}

function verifyWithParserServices(parserServices: unknown): readonly Linter.LintMessage[] {
    return verifyCodeWithParserServices('it("", function () { returnsPromise(); });', parserServices);
}

function registerAdditionalTests(): void {
    test('no-async-in-sync-tests metadata defaults to allowing no additional async methods', function () {
        assert.deepStrictEqual(noAsyncInSyncTestsRule.meta?.defaultOptions, [ { allowedAsyncMethods: [] } ]);
    });

    test('no-async-in-sync-tests parser services ignore missing parser services', function () {
        assert.deepStrictEqual(verifyWithParserServices(null), []);
    });

    test('ignores parser services that are not records', function () {
        assert.deepStrictEqual(verifyWithParserServices([]), []);
    });

    test('ignores parser services without type access', function () {
        assert.deepStrictEqual(verifyWithParserServices({}), []);
    });

    test('ignores parser services without a type checker', function () {
        assert.deepStrictEqual(
            verifyWithParserServices({
                getTypeAtLocation() {
                    return {};
                }
            }),
            []
        );
    });

    test('ignores parser services without promised type inspection', function () {
        assert.deepStrictEqual(
            verifyWithParserServices({
                getTypeAtLocation() {
                    return {};
                },
                program: {
                    getTypeChecker() {
                        return {};
                    }
                }
            }),
            []
        );
    });

    test('ignores parser services with a non-function promised type accessor', function () {
        assert.deepStrictEqual(
            verifyWithParserServices({
                getTypeAtLocation() {
                    return {};
                },
                program: {
                    getTypeChecker() {
                        return {
                            getPromisedTypeOfPromise: {}
                        };
                    }
                }
            }),
            []
        );
    });

    test('ignores type lookup failures', function () {
        assert.deepStrictEqual(
            verifyWithParserServices({
                getTypeAtLocation() {
                    throw new Error('boom');
                },
                program: {
                    getTypeChecker() {
                        return {
                            getPromisedTypeOfPromise() {
                                return {};
                            }
                        };
                    }
                }
            }),
            []
        );
    });

    test('ignores promise method names on non-promise typed expressions', function () {
        const messages = verifyCodeWithParserServices(
            'it("", function () { queryBuilder().catch(function (reason) {}); });',
            {
                getTypeAtLocation() {
                    return 'nonPromise';
                },
                program: {
                    getTypeChecker() {
                        return {
                            getPromisedTypeOfPromise() {
                                return undefined;
                            }
                        };
                    }
                }
            }
        );

        assert.deepStrictEqual(messages, []);
    });

    test('does not inspect missing returned expressions', function () {
        const messages = verifyCodeWithParserServices(
            'it("", function () { load(function (error) {}); });',
            {
                getTypeAtLocation(node: unknown) {
                    return typeof node === 'string' ? 'fakePromise' : 'notPromise';
                },
                program: {
                    getTypeChecker() {
                        return {
                            getPromisedTypeOfPromise(type: unknown) {
                                return type === 'fakePromise' ? {} : undefined;
                            }
                        };
                    }
                }
            }
        );

        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0]?.messageId, 'unexpectedCallbackAsyncOperation');
    });
}

suite('no-async-in-sync-tests', function () {
    RuleTester.it = withLongerTimeout(defaultIt);
    RuleTester.itOnly = withLongerTimeout(defaultItOnly);

    ruleTester.run('no-async-in-sync-tests', noAsyncInSyncTestsRule, {
        valid: [
            'it("", function () {});',
            'it("", function (done) { load(function (error) { done(error); }); });',
            'it("", function () { load(function () {}); });',
            'it("", async function () { await load(); });',
            'it("", function () { return load().then(function () {}); });',
            'it("", function () { return; });',
            'it("", () => load().then(function () {}));',
            'it("", function () { promise[method](cleanup); });',
            'it("", function () { return 42; });',
            'it("", function (done) { setTimeout(done, 0); });',
            'before(function () { return task().finally(cleanup); });',
            'describe("", function () { load().then(function () {}); });',
            {
                code: 'it("", function () { setTimeout(work, 0); });',
                options: [ allowSetTimeoutOption ],
                name: 'allows configured scheduled async methods'
            },
            {
                filename: typescriptFilename,
                code: 'it("", function () { return returnsPromise(); });\n' +
                    'declare function returnsPromise(): Promise<number>;',
                languageOptions: typescriptLanguageOptions
            },
            withInterface('TDD', 'test("", function () { return task().then(function () {}); });')
        ],

        invalid: [
            {
                code: 'it("", function () { load(function (error) {}); });',
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 47
                } ]
            },
            {
                code: 'it("", function () { load(function (err, result) { use(result); }); });',
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 67
                } ]
            },
            {
                code: 'it("", function () { return load(function (error) {}); });',
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 29,
                    endLine: 1,
                    endColumn: 54
                } ]
            },
            {
                code: 'it("", function () { load().then(function () {}); });',
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 49
                } ]
            },
            {
                code: 'it("", function () { something(load().catch(function (reason) {})); });',
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 32,
                    endLine: 1,
                    endColumn: 66
                } ]
            },
            {
                code: 'it("", function () { promise["then"](cleanup); });',
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 46
                } ]
            },
            ...defaultAllowedAsyncMethods.map(function (methodCall) {
                const expression = methodCall === 'setInterval' || methodCall.endsWith('.setInterval')
                    ? `${methodCall}(work, 0);`
                    : `${methodCall}(work);`;

                return {
                    code: `it("", function () { ${expression} });`,
                    errors: [ { messageId: 'unexpectedScheduledAsyncOperation' } ]
                };
            }),
            {
                code: 'it("", function () { promise?.then(cleanup); });',
                languageOptions: { ecmaVersion: 2020 },
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 44
                } ]
            },
            {
                code: 'it("", function () { promise.then?.(cleanup); });',
                languageOptions: { ecmaVersion: 2020 },
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 45
                } ]
            },
            {
                code: 'it("", function () { (promise?.then)(cleanup); });',
                languageOptions: { ecmaVersion: 2020 },
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 46
                } ]
            },
            {
                code: 'it("", () => load(function (error) {}));',
                languageOptions: { ecmaVersion: 6 },
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 14,
                    endLine: 1,
                    endColumn: 39
                } ]
            },
            {
                code: 'before(function () { initialize(function (error) {}); });',
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 53
                } ]
            },
            withInterface('TDD', {
                code: 'test("", function () { task().finally(cleanup); });',
                errors: [ { messageId: 'unexpectedPromiseAsyncOperation' } ]
            }),
            {
                filename: typescriptFilename,
                code: 'it("", function () { returnsPromise(); });\n' +
                    'declare function returnsPromise(): Promise<number>;',
                languageOptions: typescriptLanguageOptions,
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 38
                } ]
            },
            {
                filename: typescriptFilename,
                code: 'it("", function () { load(function (error) {}); });\n' +
                    'declare function load(callback: (error: Error | null) => void): void;',
                languageOptions: typescriptLanguageOptions,
                errors: [ {
                    messageId: 'unexpectedCallbackAsyncOperation',
                    line: 1,
                    column: 22,
                    endLine: 1,
                    endColumn: 47
                } ]
            },
            {
                filename: typescriptFilename,
                code: 'it("", function (this: Mocha.Context) { returnsPromise(); });\n' +
                    'declare function returnsPromise(): Promise<number>;',
                languageOptions: typescriptLanguageOptions,
                errors: [ {
                    messageId: 'unexpectedPromiseAsyncOperation',
                    line: 1,
                    column: 41,
                    endLine: 1,
                    endColumn: 57
                } ]
            }
        ]
    });

    RuleTester.it = defaultIt;
    RuleTester.itOnly = defaultItOnly;

    registerAdditionalTests();
});
