import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';

export const noNestedTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-nested-tests.md'
        },
        schema: []
    },
    create(context) {
        const entityStack: VisitorContext['type'][] = [];

        function report(node: Readonly<Rule.Node>, message: string): void {
            context.report({ message, node });
        }

        // eslint-disable-next-line complexity -- no idea how to reduce the complexity
        function checkForAndReportErrors(node: Readonly<Rule.Node>): void {
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
