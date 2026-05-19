import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';

export const noNestedTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-nested-tests.md'
        },
        messages: {
            suiteNestedInHook: 'Unexpected suite nested within a test hook.',
            suiteNestedInTest: 'Unexpected suite nested within a test.',
            testNestedInTest: 'Unexpected test nested within another test.',
            testNestedInHook: 'Unexpected test nested within a test hook.',
            hookNestedInHook: 'Unexpected test hook nested within a test hook.'
        },
        schema: []
    },
    create(context) {
        const entityStack: VisitorContext['type'][] = [];

        function report(node: Readonly<Rule.Node>, messageId: string): void {
            context.report({ messageId, node });
        }

        // eslint-disable-next-line complexity -- no idea how to reduce the complexity
        function checkForAndReportErrors(node: Readonly<Rule.Node>): void {
            const previousTypes = new Set(entityStack.slice(0, -1));
            const currentType = entityStack.at(-1);

            if (currentType === 'suite' && previousTypes.has('hook')) {
                report(node, 'suiteNestedInHook');
            } else if (currentType === 'suite' && previousTypes.has('testCase')) {
                report(node, 'suiteNestedInTest');
            } else if (currentType === 'testCase' && previousTypes.has('testCase')) {
                report(node, 'testNestedInTest');
            } else if (currentType === 'testCase' && previousTypes.has('hook')) {
                report(node, 'testNestedInHook');
            } else if (currentType === 'hook' && previousTypes.has('hook')) {
                report(node, 'hookNestedInHook');
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
