import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

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
        function report(node: Readonly<Rule.Node>, messageId: string): void {
            context.report({ messageId, node });
        }

        let hooksNesting = 0;
        let testCaseNesting = 0;

        return createMochaVisitors(context, {
            anyTestEntity(visitorContext) {
                if (visitorContext.type === 'suite') {
                    if (hooksNesting > 0) {
                        report(visitorContext.node, 'suiteNestedInHook');
                    } else if (testCaseNesting > 0) {
                        report(visitorContext.node, 'suiteNestedInTest');
                    }
                    return;
                }

                if (visitorContext.type === 'testCase') {
                    if (testCaseNesting > 0) {
                        report(visitorContext.node, 'testNestedInTest');
                    } else if (hooksNesting > 0) {
                        report(visitorContext.node, 'testNestedInHook');
                    }

                    testCaseNesting += 1;
                    return;
                }

                if (hooksNesting > 0) {
                    report(visitorContext.node, 'hookNestedInHook');
                }
                hooksNesting += 1;
            },

            'anyTestEntity:exit'(visitorContext) {
                if (visitorContext.type === 'testCase') {
                    testCaseNesting -= 1;
                } else if (visitorContext.type === 'hook') {
                    hooksNesting -= 1;
                }
            }
        });
    }
};
