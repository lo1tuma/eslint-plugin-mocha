import type { Rule } from 'eslint';
import { extractMemberExpressionPath, isConstantPath } from '../ast/member-expression.js';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { CallExpression, MemberExpression } from '../ast/node-types.js';
import { isSuiteConfigCall } from '../mocha/config-call.js';
import { reformatLastPathSegmentWithCallExpressions } from '../mocha/name-details.js';
import { convertNameToPathArray, isSamePath } from '../mocha/path.js';
import { getRuleOption } from '../rule-options.js';
import {
    allowMochaCallOptionSchema,
    defaultAllowMochaCallOption,
    normalizeMochaCallName,
    type ResolvedAllowMochaCallOption
} from './mocha-call-allowance.js';

const FUNCTION = 1;
const SUITE = 2;

function isNestedInSuiteBlock(nesting: readonly number[]): boolean {
    return nesting.at(-1) === SUITE;
}

function reportCallExpression(context: Readonly<Rule.RuleContext>, callExpression: Readonly<CallExpression>): void {
    context.report({
        messageId: 'unexpectedFunctionCall',
        node: callExpression.callee
    });
}

function reportMemberExpression(
    context: Readonly<Rule.RuleContext>,
    memberExpression: Readonly<MemberExpression>
): void {
    context.report({
        messageId: 'unexpectedMemberExpression',
        node: memberExpression
    });
}

function normalizeAllowedCall(value: unknown): readonly string[] {
    const path = convertNameToPathArray(normalizeMochaCallName(value));
    const [ lastPathSegment ] = path.slice(-1);

    return [ ...path.slice(0, -1), normalizeMochaCallName(lastPathSegment) ];
}

export const noSetupInSuiteRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow setup in suite blocks',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-setup-in-suite.md'
        },
        schema: [ allowMochaCallOptionSchema ],
        defaultOptions: [ defaultAllowMochaCallOption ],
        messages: {
            unexpectedFunctionCall: 'Unexpected function call in suite block.',
            unexpectedMemberExpression:
                'Unexpected member expression in suite block. Member expressions may call functions via getters.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        const { allow } = getRuleOption<ResolvedAllowMochaCallOption>(context);
        const allowedCalls = allow.map(normalizeAllowedCall);
        let nesting: readonly number[] = [];
        const suiteNodes = new WeakSet();

        function isAllowedCall(node: Readonly<CallExpression>): boolean {
            const calleeWithParent = { ...node.callee, parent: node };
            const path = reformatLastPathSegmentWithCallExpressions(
                extractMemberExpressionPath(context.sourceCode, calleeWithParent),
                1
            );

            return isConstantPath(path) &&
                allowedCalls.some(function (allowedCall) {
                    return isSamePath(path, allowedCall);
                });
        }

        function isAllowedCallMemberExpression(node: Readonly<MemberExpression>): boolean {
            return node.parent.type === 'CallExpression' && node.parent.callee === node && isAllowedCall(node.parent);
        }

        function handleCallExpressionInSuite(node: Readonly<CallExpression>): void {
            if (isNestedInSuiteBlock(nesting) && !isSuiteConfigCall(node) && !isAllowedCall(node)) {
                reportCallExpression(context, node);
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                nesting = [ ...nesting, SUITE ];
                suiteNodes.add(visitorContext.node);
            },

            'suite:exit'() {
                nesting = nesting.slice(0, -1);
            },

            nonMochaCallExpression(node) {
                handleCallExpressionInSuite(node);
            },

            nonMochaMemberExpression(node) {
                if (
                    !suiteNodes.has(node.parent) &&
                    isNestedInSuiteBlock(nesting) &&
                    !isSuiteConfigCall(node.parent) &&
                    !isAllowedCallMemberExpression(node)
                ) {
                    reportMemberExpression(context, node);
                }
            },

            FunctionDeclaration() {
                nesting = [ ...nesting, FUNCTION ];
            },
            'FunctionDeclaration:exit'() {
                nesting = nesting.slice(0, -1);
            },

            FunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting = [ ...nesting, FUNCTION ];
                }
            },
            'FunctionExpression:exit'(node) {
                if (!suiteNodes.has(node.parent)) {
                    nesting = nesting.slice(0, -1);
                }
            },

            ArrowFunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting = [ ...nesting, FUNCTION ];
                }
            },
            'ArrowFunctionExpression:exit'(node) {
                if (!suiteNodes.has(node.parent)) {
                    nesting = nesting.slice(0, -1);
                }
            }
        });
    }
};
