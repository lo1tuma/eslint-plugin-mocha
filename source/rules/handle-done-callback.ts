import type { Rule, Scope } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import type { FunctionExpression } from '../ast/node-types.js';
import { isRecord } from '../record.js';

function findParamInScope(paramName: string, scope: Readonly<Scope.Scope>): Readonly<Scope.Variable | undefined> {
    return scope.variables.find((variable) => {
        return variable.name === paramName && variable.defs[0]?.type === 'Parameter';
    });
}

export const handleDoneCallbackRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforces handling of callbacks for async tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/handle-done-callback.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    ignorePending: {
                        type: 'boolean',
                        default: false
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const options = isRecord(context.options[0]) ? context.options[0] : {};
        const ignorePending = options.ignorePending === true;

        function isReferenceHandled(reference: Readonly<Scope.Reference>): boolean {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- bad eslint core typing
            const node = context.sourceCode.getNodeByRangeIndex(
                reference.identifier.range?.[0] ?? 0
            ) as (Rule.Node | null);

            return node?.parent.type === 'CallExpression';
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
                    message: 'Expected "{{name}}" callback to be handled.',
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
