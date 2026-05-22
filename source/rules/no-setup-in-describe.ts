import type { Rule } from 'eslint';
import { extractMemberExpressionPath, isConstantPath } from '../ast/member-expression.js';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { CallExpression, MemberExpression } from '../ast/node-types.js';
import { isSuiteConfigCall } from '../mocha/config-call.js';
import { reformatLastPathSegmentWithCallExpressions } from '../mocha/name-details.js';
import { convertNameToPathArray, isSamePath } from '../mocha/path.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const FUNCTION = 1;
const DESCRIBE = 2;
const optionSchema = {
    type: 'object',
    properties: {
        allow: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { allow: string[]; };
const defaultOption: ResolvedOption = { allow: [] };

function isNestedInDescribeBlock(nesting: readonly number[]): boolean {
    return (
        nesting.length > 0 &&
        nesting.lastIndexOf(FUNCTION) < nesting.lastIndexOf(DESCRIBE)
    );
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

function ensureEndsWithParens(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    if (value.endsWith('()')) {
        return value;
    }

    return `${value}()`;
}

function normalizeAllowedCall(value: unknown): readonly string[] {
    const path = convertNameToPathArray(ensureEndsWithParens(value));
    const [lastPathSegment] = path.slice(-1);

    return [...path.slice(0, -1), ensureEndsWithParens(lastPathSegment)];
}

export const noSetupInDescribeRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow setup in describe blocks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-setup-in-describe.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            unexpectedFunctionCall: 'Unexpected function call in describe block.',
            unexpectedMemberExpression:
                'Unexpected member expression in describe block. Member expressions may call functions via getters.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { allow } = getRuleOption<ResolvedOption>(context);
        const allowedCalls = allow.map(normalizeAllowedCall);
        const nesting: number[] = [];
        const suiteNodes = new WeakSet();

        function isAllowedCall(node: Readonly<CallExpression>): boolean {
            const calleeWithParent = { ...node.callee, parent: node };
            const path = reformatLastPathSegmentWithCallExpressions(
                extractMemberExpressionPath(context.sourceCode, calleeWithParent),
                1
            );

            return isConstantPath(path) &&
                allowedCalls.some((allowedCall) => {
                    return isSamePath(path, allowedCall);
                });
        }

        function isAllowedCallMemberExpression(node: Readonly<MemberExpression>): boolean {
            return node.parent.type === 'CallExpression' && node.parent.callee === node && isAllowedCall(node.parent);
        }

        function handleCallExpressionInDescribe(node: Readonly<CallExpression>): void {
            if (isNestedInDescribeBlock(nesting) && !isSuiteConfigCall(node) && !isAllowedCall(node)) {
                reportCallExpression(context, node);
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                nesting.push(DESCRIBE);
                suiteNodes.add(visitorContext.node);
            },

            'suite:exit'() {
                nesting.pop();
            },

            nonMochaCallExpression(node) {
                if (nesting.length === 0) {
                    return;
                }
                handleCallExpressionInDescribe(node);
            },

            nonMochaMemberExpression(node) {
                if (
                    !suiteNodes.has(node.parent) &&
                    isNestedInDescribeBlock(nesting) &&
                    !isSuiteConfigCall(node.parent) &&
                    !isAllowedCallMemberExpression(node)
                ) {
                    reportMemberExpression(context, node);
                }
            },

            FunctionDeclaration() {
                if (nesting.length > 0) {
                    nesting.push(FUNCTION);
                }
            },
            'FunctionDeclaration:exit'() {
                if (nesting.length > 0) {
                    nesting.pop();
                }
            },

            FunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.push(FUNCTION);
                }
            },
            'FunctionExpression:exit'(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.pop();
                }
            },

            ArrowFunctionExpression(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.push(FUNCTION);
                }
            },
            'ArrowFunctionExpression:exit'(node) {
                if (nesting.length > 0 && !suiteNodes.has(node.parent)) {
                    nesting.pop();
                }
            }
        });
    }
};
