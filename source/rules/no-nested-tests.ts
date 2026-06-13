import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const noNestedTestsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow tests to be nested within other tests',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-nested-tests.md'
        },
        schema: [],
        messages: {
            suiteNestedInHook: 'Unexpected suite nested within a test hook.',
            suiteNestedInTest: 'Unexpected suite nested within a test.',
            testNestedInTest: 'Unexpected test nested within another test.',
            testNestedInHook: 'Unexpected test nested within a test hook.',
            hookNestedInHook: 'Unexpected test hook nested within a test hook.'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        function report(node: Readonly<Rule.Node>, messageId: string): void {
            context.report({ messageId, node });
        }

        let hooksNesting = 0;
        let testCaseNesting = 0;

        function reportNestedSuite(node: Readonly<Rule.Node>): void {
            if (hooksNesting > 0) {
                report(node, 'suiteNestedInHook');
            } else if (testCaseNesting > 0) {
                report(node, 'suiteNestedInTest');
            }
        }

        function reportNestedTestCase(node: Readonly<Rule.Node>): void {
            if (testCaseNesting > 0) {
                report(node, 'testNestedInTest');
            } else if (hooksNesting > 0) {
                report(node, 'testNestedInHook');
            }
        }

        function enterHook(node: Readonly<Rule.Node>): void {
            if (hooksNesting > 0) {
                report(node, 'hookNestedInHook');
            }
            hooksNesting += 1;
        }

        return createMochaVisitors(context, {
            anyTestEntity(visitorContext) {
                if (visitorContext.type === 'suite') {
                    reportNestedSuite(visitorContext.node);
                    return;
                }

                if (visitorContext.type === 'testCase') {
                    reportNestedTestCase(visitorContext.node);
                    testCaseNesting += 1;
                    return;
                }

                if (visitorContext.type === 'hook') {
                    enterHook(visitorContext.node);
                }
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
