import { type AnyFunction, isIdentifier } from '../ast/node-types.js';

function isTypeScriptThisParameter(param: Readonly<AnyFunction['params'][number]> | undefined): boolean {
    return param !== undefined && isIdentifier(param) && param.name === 'this';
}

export function getFirstMeaningfulParameter(
    node: Readonly<AnyFunction>
): AnyFunction['params'][number] | undefined {
    const [ firstParam, secondParam ] = node.params;

    return isTypeScriptThisParameter(firstParam) ? secondParam : firstParam;
}

export function getIdentifierCallbackParameter(
    node: Readonly<AnyFunction>
): Extract<AnyFunction['params'][number], { readonly type: 'Identifier'; }> | undefined {
    const callbackParameter = getFirstMeaningfulParameter(node);

    return callbackParameter?.type === 'Identifier' ? callbackParameter : undefined;
}

export function hasCallbackParameter(node: Readonly<AnyFunction>): boolean {
    return getFirstMeaningfulParameter(node) !== undefined;
}
