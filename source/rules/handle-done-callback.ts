import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { FunctionExpression } from '../ast/node-types.js';
import { getRuleOption, type InferSchemaOption, type RuleSchema } from '../rule-options.js';

const optionSchema = {
    type: 'object',
    properties: {
        ignorePending: {
            type: 'boolean'
        }
    },
    additionalProperties: false
} as const satisfies RuleSchema;

type Option = InferSchemaOption<typeof optionSchema>;
type ResolvedOption = Option & { ignorePending: boolean; };
const defaultOption: ResolvedOption = { ignorePending: false };

function findParamInScope(paramName: string, scope: Readonly<Scope.Scope>): Readonly<Scope.Variable | undefined> {
    const variable = scope.set.get(paramName);

    return variable?.defs[0]?.type === 'Parameter' ? variable : undefined;
}

export const handleDoneCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces handling of callbacks for async tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/handle-done-callback.md'
        },
        defaultOptions: [defaultOption],
        messages: {
            expectedCallback: 'Expected "{{name}}" callback to be handled.'
        },
        schema: [optionSchema]
    },
    create(context) {
        const { ignorePending } = getRuleOption<ResolvedOption>(context);

        function isReferenceHandled(reference: Readonly<Scope.Reference>): boolean {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- eslint core typing omits parent
            const node = reference.identifier as Rule.Node;
            return node.parent.type === 'CallExpression';
        }

        function hasHandledReferences(references: readonly Scope.Reference[]): boolean {
            return references.some(isReferenceHandled);
        }

        function checkAsyncMochaFunction(functionExpression: Readonly<FunctionExpression>): void {
            const scope = context.sourceCode.getScope(functionExpression);
            const callback = functionExpression.params[0];

            if (callback === undefined || callback.type !== 'Identifier') {
                return;
            }

            const callbackName = callback.name;
            const callbackVariable = findParamInScope(callbackName, scope);

            if (callbackVariable !== undefined && !hasHandledReferences(callbackVariable.references)) {
                context.report({
                    node: callback,
                    messageId: 'expectedCallback',
                    data: { name: callbackName }
                });
            }
        }

        return createMochaVisitors(context, {
            testCaseCallback(visitorContext) {
                if (visitorContext.modifier === 'pending' && ignorePending) {
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                checkAsyncMochaFunction(visitorContext.node as FunctionExpression);
            },

            hookCallback(visitorContext) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                checkAsyncMochaFunction(visitorContext.node as FunctionExpression);
            }
        });
    }
};
