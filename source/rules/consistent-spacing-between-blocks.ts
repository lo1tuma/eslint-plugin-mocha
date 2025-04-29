import type { Rule } from 'eslint';
import type { Except } from 'type-fest';
import { createMochaVisitors, type VisitorContext } from '../ast/mocha-visitors.js';
import {
    type AnyFunction,
    isBlockStatement,
    isFunction,
    isMemberExpression,
    isProgram,
    type Program
} from '../ast/node-types.js';
import { getLastOrThrow } from '../list.js';

const minimumAmountOfLinesBetweenNeeded = 2;

function containsNode(nodeA: Except<Rule.Node, 'parent'>, nodeB: Except<Rule.Node, 'parent'>): boolean {
    const { range: rangeA } = nodeA;
    const { range: rangeB } = nodeB;
    if (rangeA === undefined || rangeB === undefined) {
        return false;
    }

    return rangeB[1] <= rangeA[1] && rangeB[0] >= rangeA[0];
}

function isFirstStatementInScope(scopeNode: Layer['scopeNode'], node: Rule.Node): boolean {
    if (isBlockStatement(scopeNode) || isProgram(scopeNode)) {
        const [firstNode] = scopeNode.body;
        if (firstNode !== undefined) {
            return containsNode(firstNode, node);
        }
    }

    return containsNode(scopeNode, node);
}

type Layer = {
    entities: VisitorContext[];
    scopeNode: AnyFunction['body'] | Program;
};

function getParentWhileMemberExpression(node: Rule.Node): Rule.Node {
    if (isMemberExpression(node.parent)) {
        return getParentWhileMemberExpression(node.parent);
    }
    return node;
}

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
        const layers: Layer[] = [];
        const { sourceCode } = context;

        function addEntityToCurrentLayer(visitorContext: Readonly<VisitorContext>): void {
            const currentLayer = getLastOrThrow(layers);
            currentLayer.entities.push(visitorContext);
        }

        // eslint-disable-next-line complexity -- no idea how to refactor
        function checkCurrentLayer(): void {
            const currentLayer = getLastOrThrow(layers);

            for (const entity of currentLayer.entities) {
                const node = getParentWhileMemberExpression(entity.node);
                const beforeToken = sourceCode.getTokenBefore(node);

                if (!isFirstStatementInScope(currentLayer.scopeNode, node) && beforeToken !== null) {
                    const linesBetween = (node.loc?.start.line ?? 0) - (beforeToken.loc.end.line);

                    if (linesBetween < minimumAmountOfLinesBetweenNeeded) {
                        context.report({
                            node: entity.node,
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
            },

            suiteCallback(visitorContext) {
                const { node } = visitorContext;
                if (isFunction(node)) {
                    layers.push({ entities: [], scopeNode: node.body });
                }
            },

            'suiteCallback:exit'() {
                checkCurrentLayer();
                layers.pop();
            },

            Program(node) {
                layers.push({ entities: [], scopeNode: node });
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
