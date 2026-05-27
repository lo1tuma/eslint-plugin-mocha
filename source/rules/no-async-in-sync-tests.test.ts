import * as typescriptParser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import assert from 'node:assert';
import { withInterface } from '../mocha-interface-test-cases.js';
import { isRecord } from '../record.js';
import { noAsyncInSyncTestsRule } from './no-async-in-sync-tests.js';

const slowTypedTestTimeout = 30_000;
const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } });
const { pathname: projectRoot } = new URL('../../', import.meta.url);
const { pathname: typescriptFilename } = new URL('./no-async-in-sync-tests.fixture.ts', import.meta.url);
const allowSetTimeoutOption = { allowedAsyncMethods: ['setTimeout'] };
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
        projectService: { allowDefaultProject: ['source/rules/*.fixture.ts'] },
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

function verifyWithParserServices(parserServices: unknown): readonly Linter.LintMessage[] {
    const linter = new Linter({ configType: 'flat' });

    return linter.verify('it("", function () { returnsPromise(); });', [{
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            parser: {
                parseForESLint(code: string, options: Record<string, unknown>) {
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
    }]);
}

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
            options: [allowSetTimeoutOption]
        },
        {
            code: 'it("", function () { queryBuilder().catch(function (reason) {}); });\n' +
                'declare function queryBuilder(): { catch(callback: (reason: unknown) => number): number; };',
            filename: typescriptFilename,
            languageOptions: typescriptLanguageOptions
        },
        {
            code: 'it("", function () { return returnsPromise(); });\n' +
                'declare function returnsPromise(): Promise<number>;',
            filename: typescriptFilename,
            languageOptions: typescriptLanguageOptions
        },
        withInterface('TDD', 'test("", function () { return task().then(function () {}); });')
    ],

    invalid: [
        {
            code: 'it("", function () { load(function (error) {}); });',
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        {
            code: 'it("", function () { load(function (err, result) { use(result); }); });',
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        {
            code: 'it("", function () { return load(function (error) {}); });',
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        {
            code: 'it("", function () { load().then(function () {}); });',
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", function () { something(load().catch(function (reason) {})); });',
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", function () { promise["then"](cleanup); });',
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        ...defaultAllowedAsyncMethods.map((methodCall) => {
            const expression = methodCall === 'setInterval' || methodCall.endsWith('.setInterval')
                ? `${methodCall}(work, 0);`
                : `${methodCall}(work);`;

            return {
                code: `it("", function () { ${expression} });`,
                errors: [{ messageId: 'unexpectedScheduledAsyncOperation' }]
            };
        }),
        {
            code: 'it("", function () { promise?.then(cleanup); });',
            languageOptions: { ecmaVersion: 2020 },
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", function () { promise.then?.(cleanup); });',
            languageOptions: { ecmaVersion: 2020 },
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", function () { (promise?.then)(cleanup); });',
            languageOptions: { ecmaVersion: 2020 },
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", () => load(function (error) {}));',
            languageOptions: { ecmaVersion: 6 },
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        {
            code: 'before(function () { initialize(function (error) {}); });',
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        withInterface('TDD', {
            code: 'test("", function () { task().finally(cleanup); });',
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        }),
        {
            code: 'it("", function () { returnsPromise(); });\n' +
                'declare function returnsPromise(): Promise<number>;',
            filename: typescriptFilename,
            languageOptions: typescriptLanguageOptions,
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        },
        {
            code: 'it("", function () { load(function (error) {}); });\n' +
                'declare function load(callback: (error: Error | null) => void): void;',
            filename: typescriptFilename,
            languageOptions: typescriptLanguageOptions,
            errors: [{ messageId: 'unexpectedCallbackAsyncOperation' }]
        },
        {
            code: 'it("", function (this: Mocha.Context) { returnsPromise(); });\n' +
                'declare function returnsPromise(): Promise<number>;',
            filename: typescriptFilename,
            languageOptions: typescriptLanguageOptions,
            errors: [{ messageId: 'unexpectedPromiseAsyncOperation' }]
        }
    ]
});

RuleTester.it = defaultIt;
RuleTester.itOnly = defaultItOnly;

describe('no-async-in-sync-tests metadata', function () {
    it('defaults to allowing no additional async methods', function () {
        assert.deepStrictEqual(noAsyncInSyncTestsRule.meta?.defaultOptions, [{ allowedAsyncMethods: [] }]);
    });
});

describe('no-async-in-sync-tests parser services', function () {
    it('ignores missing parser services', function () {
        assert.deepStrictEqual(verifyWithParserServices(null), []);
    });

    it('ignores parser services that are not records', function () {
        assert.deepStrictEqual(verifyWithParserServices([]), []);
    });

    it('ignores parser services without type access', function () {
        assert.deepStrictEqual(verifyWithParserServices({}), []);
    });

    it('ignores parser services without a type checker', function () {
        assert.deepStrictEqual(
            verifyWithParserServices({
                getTypeAtLocation() {
                    return {};
                }
            }),
            []
        );
    });

    it('ignores parser services without promised type inspection', function () {
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

    it('ignores parser services with a non-function promised type accessor', function () {
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

    it('ignores type lookup failures', function () {
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
});
