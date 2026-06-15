import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { expectNodeRange } from '../ast/node-location.ts';

type ExportNamedDeclarationNode = Readonly<Parameters<NonNullable<Rule.RuleListener['ExportNamedDeclaration']>>[0]>;
type ExportDefaultDeclarationNode = Readonly<Parameters<NonNullable<Rule.RuleListener['ExportDefaultDeclaration']>>[0]>;
type ExportAllDeclarationNode = Readonly<Parameters<NonNullable<Rule.RuleListener['ExportAllDeclaration']>>[0]>;
type ImmutableExportNode<T> = { readonly [Key in keyof T]: T[Key]; };
type ExportNode = ImmutableExportNode<
    ExportAllDeclarationNode | ExportDefaultDeclarationNode | ExportNamedDeclarationNode
>;
type NamedExportWithDeclaration = ImmutableExportNode<
    ExportNamedDeclarationNode & {
        readonly declaration: Exclude<ExportNamedDeclarationNode['declaration'], null | undefined>;
    }
>;
type DefaultExportWithNamedDeclaration = ImmutableExportNode<
    ExportDefaultDeclarationNode & {
        readonly declaration: {
            readonly id: Readonly<Record<string, unknown>>;
            readonly range?: Readonly<Rule.Node['range']>;
            readonly type: 'ClassDeclaration' | 'FunctionDeclaration';
        };
    }
>;
type ExportSuggestion = Readonly<NonNullable<Rule.ReportDescriptor['suggest']>[number]>;

function isNamedExportWithDeclaration(node: Readonly<ExportNode>): node is Readonly<NamedExportWithDeclaration> {
    return node.type === 'ExportNamedDeclaration' && node.declaration !== null;
}

function isNamedDefaultExportDeclaration(
    node: Readonly<ExportNode>
): node is Readonly<DefaultExportWithNamedDeclaration> {
    return node.type === 'ExportDefaultDeclaration' &&
        (node.declaration.type === 'ClassDeclaration' || node.declaration.type === 'FunctionDeclaration') &&
        node.declaration.id !== null;
}

function isLocalNamedExportList(node: Readonly<ExportNode>): node is Readonly<ExportNamedDeclarationNode> {
    return node.type === 'ExportNamedDeclaration' &&
        node.source === null;
}

type NodeWithOptionalRange = {
    readonly range?: Readonly<readonly [number, number]> | null | undefined;
};

function fixRemoveExportKeyword(
    fixer: Rule.RuleFixer,
    node: Readonly<ExportNode>,
    declaration: NodeWithOptionalRange
): Readonly<Rule.Fix | null> {
    const range = expectNodeRange(node);
    const declarationRange = expectNodeRange(declaration);

    return fixer.removeRange([ range[0], declarationRange[0] ]);
}

function fixRemoveDefaultExportKeyword(
    fixer: Rule.RuleFixer,
    node: Readonly<DefaultExportWithNamedDeclaration>
): Readonly<Rule.Fix | null> {
    return fixRemoveExportKeyword(fixer, node, node.declaration);
}

function fixRemoveExportStatement(
    fixer: Rule.RuleFixer,
    node: Readonly<ExportNamedDeclarationNode>
): Readonly<Rule.Fix | null> {
    return fixer.removeRange(expectNodeRange(node));
}

function createExportSuggestions(node: Readonly<ExportNode>): ExportSuggestion[] {
    if (isNamedExportWithDeclaration(node)) {
        return [ {
            messageId: 'removeExportKeyword',
            fix(fixer) {
                return fixRemoveExportKeyword(fixer, node, node.declaration);
            }
        } ];
    }

    if (isNamedDefaultExportDeclaration(node)) {
        return [ {
            messageId: 'removeExportKeyword',
            fix(fixer) {
                return fixRemoveDefaultExportKeyword(fixer, node);
            }
        } ];
    }

    if (isLocalNamedExportList(node)) {
        return [ {
            messageId: 'removeExportStatement',
            fix(fixer) {
                return fixRemoveExportStatement(fixer, node);
            }
        } ];
    }

    return [];
}

export const noExportsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow exports from test files',
            recommended: true,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-exports.md'
        },
        hasSuggestions: true,
        schema: [],
        messages: {
            unexpectedExport: 'Unexpected export from a test file',
            removeExportKeyword: 'Remove the export keyword',
            removeExportStatement: 'Remove this export statement'
        },
        languages: [ 'js/js' ]
    },
    create(context) {
        const exportNodes: ExportNode[] = [];
        let hasTestCase = false;

        return createMochaVisitors(context, {
            'Program:exit'() {
                if (!hasTestCase || exportNodes.length === 0) {
                    return;
                }

                for (const node of exportNodes) {
                    const suggestions = createExportSuggestions(node);

                    context.report(
                        suggestions.length === 0
                            ? {
                                node,
                                messageId: 'unexpectedExport'
                            }
                            : {
                                node,
                                messageId: 'unexpectedExport',
                                suggest: suggestions
                            }
                    );
                }
            },

            anyTestEntity() {
                if (!hasTestCase) {
                    hasTestCase = true;
                }
            },

            ExportNamedDeclaration(node) {
                exportNodes.push(node);
            },

            ExportDefaultDeclaration(node) {
                exportNodes.push(node);
            },

            ExportAllDeclaration(node) {
                exportNodes.push(node);
            }
        });
    }
};
