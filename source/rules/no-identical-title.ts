import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { isCallExpression, isLiteral } from '../ast/node-types.js';
import { getLastOrThrow } from '../list.js';

type Layer = {
    suiteTitles: string[];
    testTitles: string[];
};

function newLayer(): Readonly<Layer> {
    return {
        suiteTitles: [],
        testTitles: []
    };
}

export function extractTitleArgument(node: Readonly<Rule.Node>): string | null {
    if (isCallExpression(node)) {
        const [firstArg] = node.arguments;
        if (firstArg !== undefined && isLiteral(firstArg)) {
            return firstArg.value?.toString() ?? null;
        }
    }

    return null;
}

export const noIdenticalTitleRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        languages: ['js/js'],
        docs: {
            description: 'Disallow identical titles',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-identical-title.md'
        },
        messages: {
            duplicateTestTitle: 'Test title is used multiple times in the same test suite.',
            duplicateSuiteTitle: 'Test suite title is used multiple times.'
        },
        schema: []
    },
    create(context) {
        const titleLayers: [Layer, ...Layer[]] = [newLayer()];

        function handleTestCaseTitles(visitorContext: Readonly<VisitorContext>, title: string): void {
            const currentLayer = getLastOrThrow(titleLayers);
            const titles = currentLayer.testTitles;

            if (titles.includes(title)) {
                context.report({
                    node: visitorContext.node,
                    messageId: 'duplicateTestTitle'
                });
            }
            titles.push(title);
        }

        function handleTestSuiteTitles(visitorContext: Readonly<VisitorContext>, title: string): void {
            const currentLayer = getLastOrThrow(titleLayers);
            const titles = currentLayer.suiteTitles;

            if (titles.includes(title)) {
                context.report({
                    node: visitorContext.node,
                    messageId: 'duplicateSuiteTitle'
                });
            }
            titles.push(title);
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                const title = extractTitleArgument(visitorContext.node);

                if (title !== null) {
                    handleTestSuiteTitles(visitorContext, title);
                }

                titleLayers.push(newLayer());
            },

            'suite:exit'() {
                titleLayers.pop();
            },

            testCase(visitorContext) {
                const title = extractTitleArgument(visitorContext.node);

                if (title === null) {
                    return;
                }

                handleTestCaseTitles(visitorContext, title);
            }
        });
    }
};
