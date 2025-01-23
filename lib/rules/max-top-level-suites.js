import { isNil } from 'rambda';
import { createMochaVisitors } from '../ast/mochaVisitors.js';

const defaultSuiteLimit = 1;

function isTopLevelScope(scope) {
    return scope.type === 'module' || scope.upper === null;
}

export const maxTopLevelSuitesRule = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce the number of top-level suites in a single file',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/max-top-level-suites.md'
        },
        schema: [
            {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer'
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create(context) {
        const topLevelSuites = [];
        const options = context.options[0] || {};
        const suiteLimit = isNil(options.limit) ? defaultSuiteLimit : options.limit;

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const scope = context.sourceCode.getScope(visitorContext.node);

                if (isTopLevelScope(scope)) {
                    topLevelSuites.push(visitorContext.node);
                }
            },

            'Program:exit'() {
                if (topLevelSuites.length > suiteLimit) {
                    context.report({
                        node: topLevelSuites[suiteLimit],
                        message: `The number of top-level suites is more than ${suiteLimit}.`
                    });
                }
            }
        });
    }
};
