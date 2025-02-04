import { createMochaVisitors } from '../ast/mochaVisitors.js';

function extractSourceTextByRange(sourceCode, start, end) {
    return sourceCode.text.slice(start, end).trim();
}

// eslint-disable-next-line max-statements -- we need to refactor this function to reduce complexity
function formatFunctionHead(sourceCode, fn) {
    const arrow = sourceCode.getTokenBefore(fn.body);
    const beforeArrowToken = sourceCode.getTokenBefore(arrow);
    let firstToken = sourceCode.getFirstToken(fn);

    let functionKeyword = 'function';
    let params = extractSourceTextByRange(
        sourceCode,
        firstToken.range[0],
        beforeArrowToken.range[1]
    );
    if (fn.async) {
        // When 'async' specified strip the token from the params text
        // and prepend it to the function keyword
        params = params.slice(firstToken.range[1] - firstToken.range[0]).trim();
        functionKeyword = 'async function';

        // Advance firstToken pointer
        firstToken = sourceCode.getTokenAfter(firstToken);
    }

    const beforeArrowComment = extractSourceTextByRange(
        sourceCode,
        beforeArrowToken.range[1],
        arrow.range[0]
    );
    const afterArrowComment = extractSourceTextByRange(
        sourceCode,
        arrow.range[1],
        fn.body.range[0]
    );
    const paramsFullText = firstToken.type === 'Punctuator'
        ? `${params}${beforeArrowComment}${afterArrowComment}`
        : `(${params}${beforeArrowComment})${afterArrowComment}`;

    return `${functionKeyword}${paramsFullText} `;
}

function fixArrowFunction(fixer, sourceCode, fn) {
    if (fn.body.type === 'BlockStatement') {
        // When it((...) => { ... }),
        // simply replace '(...) => ' with 'function () '
        return fixer.replaceTextRange(
            [fn.range[0], fn.body.range[0]],
            formatFunctionHead(sourceCode, fn)
        );
    }

    const bodyText = sourceCode.getText(fn.body);
    return fixer.replaceTextRange(
        fn.range,
        `${formatFunctionHead(sourceCode, fn)}{ return ${bodyText}; }`
    );
}

export const noMochaArrowsRule = {
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
        const sourceCode = context.getSourceCode();

        return createMochaVisitors(context, {
            anyTestEntityCallback(visitorContext) {
                if (visitorContext.node.type === 'ArrowFunctionExpression') {
                    context.report({
                        node: visitorContext.node.parent,
                        message: `Do not pass arrow functions to ${visitorContext.name}`,
                        fix(fixer) {
                            return fixArrowFunction(
                                fixer,
                                sourceCode,
                                visitorContext.node
                            );
                        }
                    });
                }
            }
        });
    }
};
