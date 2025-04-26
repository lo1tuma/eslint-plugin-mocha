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

function extractTitleArgument(node: Readonly<Rule.Node>): string | null {
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
        docs: {
            description: 'Disallow identical titles',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-identical-title.md'
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
                    message: 'Test title is used multiple times in the same test suite.'
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
                    message: 'Test suite title is used multiple times.'
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
