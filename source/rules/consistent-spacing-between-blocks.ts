import type { Rule } from 'eslint';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import { getLastOrThrow } from '../list.js';

const minimumAmountOfLinesBetweenNeeded = 2;

function isFirstStatementInScope(node: Readonly<Rule.Node>): boolean {
    // @ts-expect-error -- ok in this case
    return node.parent.parent.body[0] === node.parent; // eslint-disable-line @typescript-eslint/no-unsafe-member-access -- ok in this case
}

type Layer = {
    entities: VisitorContext[];
};

export const consistentSpacingBetweenBlocksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        fixable: 'whitespace',
        schema: [],
        docs: {
            description: 'Require consistent spacing between blocks',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/' +
                'consistent-spacing-between-blocks.md'
        }
    },

    create(context) {
        const layers: [Layer, ...Layer[]] = [{ entities: [] }];
        const { sourceCode } = context;

        function addEntityToCurrentLayer(visitorContext: Readonly<VisitorContext>): void {
            const currentLayer = getLastOrThrow(layers);
            currentLayer.entities.push(visitorContext);
        }

        // eslint-disable-next-line complexity -- no idea how to refactor
        function checkCurrentLayer(): void {
            const currentLayer = getLastOrThrow(layers);

            for (const entity of currentLayer.entities) {
                const { node } = entity;
                const beforeToken = sourceCode.getTokenBefore(node);

                if (!isFirstStatementInScope(node) && beforeToken !== null) {
                    const linesBetween = (node.loc?.start.line ?? 0) - (beforeToken.loc.end.line);

                    if (linesBetween < minimumAmountOfLinesBetweenNeeded) {
                        context.report({
                            node,
                            message: 'Expected line break before this statement.',
                            fix(fixer) {
                                return fixer.insertTextAfter(
                                    beforeToken,
                                    linesBetween === 0 ? '\n\n' : '\n'
                                );
                            }
                        });
                    }
                }
            }
        }

        return createMochaVisitors(context, {
            suite(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
                layers.push({ entities: [] });
            },

            'suite:exit'() {
                checkCurrentLayer();
                layers.pop();
            },

            'Program:exit'() {
                checkCurrentLayer();
            },

            testCase(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            },

            hook(visitorContext) {
                addEntityToCurrentLayer(visitorContext);
            }
        });
    }
};
