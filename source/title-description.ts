import { getStringIfConstant } from '@eslint-community/eslint-utils';
import type { SourceCode } from 'eslint';
import type { CallExpression } from './ast/node-types.ts';

export type TitleDescription =
    | { readonly kind: 'dynamic'; }
    | { readonly kind: 'missing'; }
    | { readonly kind: 'static'; readonly value: string; };

export function getTitleDescription(
    sourceCode: Readonly<SourceCode>,
    mochaCallExpression: Readonly<CallExpression>
): TitleDescription {
    const descriptionArgument = mochaCallExpression.arguments[0];

    if (descriptionArgument === undefined) {
        return { kind: 'missing' };
    }

    const staticDescription = getStringIfConstant(
        descriptionArgument,
        sourceCode.getScope(mochaCallExpression)
    );

    return staticDescription === null
        ? { kind: 'dynamic' }
        : { kind: 'static', value: staticDescription };
}
