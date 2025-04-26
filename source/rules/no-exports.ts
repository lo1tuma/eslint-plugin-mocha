import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';

export const noExportsRule: Readonly<Rule.RuleModule> = {
    meta: {
        docs: {
            description: 'Disallow exports from test files',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-exports.md'
        },
        messages: {
            unexpectedExport: 'Unexpected export from a test file'
        },
        type: 'suggestion',
        schema: []
    },
    create(context) {
        const exportNodes: Rule.Node[] = [];
        let hasTestCase = false;

        return createMochaVisitors(context, {
            'Program:exit'() {
                if (hasTestCase && exportNodes.length > 0) {
                    for (const node of exportNodes) {
                        context.report({ node, messageId: 'unexpectedExport' });
                    }
                }
            },

            anyTestEntity() {
                if (!hasTestCase) {
                    hasTestCase = true;
                }
            },

            'ExportNamedDeclaration, ExportDefaultDeclaration, ExportAllDeclaration'(
                node
            ) {
                exportNodes.push(node);
            }
        });
    }
};
