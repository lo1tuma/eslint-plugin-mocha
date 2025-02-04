import { createMochaVisitors } from '../ast/mochaVisitors.js';

export const noNestedTestsRule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-nested-tests.md'
        },
        schema: []
    },
    create(context) {
        const entityStack = [];

        function report(callExpression, message) {
            context.report({
                message,
                node: callExpression
            });
        }

        // eslint-disable-next-line complexity -- no idea how to reduce the complexity
        function checkForAndReportErrors(node) {
            const previousTypes = new Set(entityStack.slice(0, -1));
            const currentType = entityStack.at(-1);

            if (currentType === 'suite' && previousTypes.has('hook')) {
                report(node, 'Unexpected suite nested within a test hook.');
            } else if (currentType === 'suite' && previousTypes.has('testCase')) {
                report(node, 'Unexpected suite nested within a test.');
            } else if (currentType === 'testCase' && previousTypes.has('testCase')) {
                report(node, 'Unexpected test nested within another test.');
            } else if (currentType === 'testCase' && previousTypes.has('hook')) {
                report(node, 'Unexpected test nested within a test hook.');
            } else if (currentType === 'hook' && previousTypes.has('hook')) {
                report(node, 'Unexpected test hook nested within a test hook.');
            }
        }

        return createMochaVisitors(context, {
            anyTestEntity(visitorContext) {
                entityStack.push(visitorContext.type);
                checkForAndReportErrors(visitorContext.node);
            },

            'anyTestEntity:exit'() {
                entityStack.pop();
            }
        });
    }
};
