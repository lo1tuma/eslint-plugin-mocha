/* eslint-disable @typescript-eslint/no-non-null-assertion -- needed */
import type { Rule, SourceCode } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.js';
import { type ArrowFunctionExpression, isArrowFunctionExpression } from '../ast/node-types.js';

function extractSourceTextByRange(sourceCode: Readonly<SourceCode>, start: number, end: number): string {
    return sourceCode.text.slice(start, end).trim();
}

// eslint-disable-next-line max-statements -- we need to refactor this function to reduce complexity
function formatFunctionHead(sourceCode: Readonly<SourceCode>, fn: Readonly<ArrowFunctionExpression>): string {
    const arrow = sourceCode.getTokenBefore(fn.body);
    const beforeArrowToken = sourceCode.getTokenBefore(arrow!);
    let firstToken = sourceCode.getFirstToken(fn);

    let functionKeyword = 'function';
    let params = extractSourceTextByRange(
        sourceCode,
        firstToken!.range[0],
        beforeArrowToken!.range[1]
    );
    if (fn.async === true) {
        // When 'async' specified strip the token from the params text
        // and prepend it to the function keyword
        params = params.slice(firstToken!.range[1] - firstToken!.range[0]).trim();
        functionKeyword = 'async function';

        // Advance firstToken pointer
        firstToken = sourceCode.getTokenAfter(firstToken!);
    }

    const beforeArrowComment = extractSourceTextByRange(
        sourceCode,
        beforeArrowToken!.range[1],
        arrow!.range[0]
    );
    const afterArrowComment = extractSourceTextByRange(
        sourceCode,
        arrow!.range[1],
        fn.body.range![0]
    );
    const paramsFullText = firstToken!.type === 'Punctuator'
        ? `${params}${beforeArrowComment}${afterArrowComment}`
        : `(${params}${beforeArrowComment})${afterArrowComment}`;

    return `${functionKeyword}${paramsFullText} `;
}

function fixArrowFunction(
    fixer: Rule.RuleFixer,
    sourceCode: Readonly<SourceCode>,
    fn: Readonly<ArrowFunctionExpression>
): Readonly<Rule.Fix> {
    if (fn.body.type === 'BlockStatement') {
        // When it((...) => { ... }),
        // simply replace '(...) => ' with 'function () '
        return fixer.replaceTextRange(
            [fn.range![0], fn.body.range![0]],
            formatFunctionHead(sourceCode, fn)
        );
    }

    const bodyText = sourceCode.getText(fn.body);
    return fixer.replaceTextRange(
        fn.range!,
        `${formatFunctionHead(sourceCode, fn)}{ return ${bodyText}; }`
    );
}

export const noMochaArrowsRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow arrow functions as arguments to mocha functions',
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/docs/rules/no-mocha-arrows.md'
        },
        fixable: 'code',
        schema: []
    },
    create(context) {
        const { sourceCode } = context;

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                const { node } = visitorContext;
                if (isArrowFunctionExpression(node)) {
                    context.report({
                        node: visitorContext.node.parent,
                        message: `Do not pass arrow functions to ${visitorContext.name}`,
                        fix(fixer) {
                            return fixArrowFunction(fixer, sourceCode, node);
                        }
                    });
                }
            }
        });
    }
};
