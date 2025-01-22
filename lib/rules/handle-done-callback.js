import { find } from 'rambda';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

function findParamInScope(paramName, scope) {
    return find((variable) => {
        return variable.name === paramName && variable.defs[0].type === 'Parameter';
    }, scope.variables);
}

export const handleDoneCallbackRule = {
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
        const [{ ignorePending = false } = {}] = context.options;

        function isReferenceHandled(reference) {
            const { parent } = context.getSourceCode().getNodeByRangeIndex(reference.identifier.range[0]);

            return parent.type === 'CallExpression';
        }

        function hasHandledReferences(references) {
            return references.some(isReferenceHandled);
        }

        function checkAsyncMochaFunction(functionExpression) {
            const scope = context.sourceCode.getScope(functionExpression);
            const callback = functionExpression.params[0];

            if (!callback) {
                return;
            }

            const callbackName = callback.name;
            const callbackVariable = findParamInScope(callbackName, scope);

            if (callbackVariable && !hasHandledReferences(callbackVariable.references)) {
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

                checkAsyncMochaFunction(visitorContext.node);
            },

            hookCallback(visitorContext) {
                checkAsyncMochaFunction(visitorContext.node);
            }
        });
    }
};
