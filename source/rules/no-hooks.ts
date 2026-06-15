import type { Rule } from 'eslint';
import { createMochaVisitors } from '../ast/mocha-visitors.ts';
import { getRuleOption } from '../rule-options.ts';
import {
    allowMochaCallOptionSchema,
    defaultAllowMochaCallOption,
    normalizeMochaCallName,
    type ResolvedAllowMochaCallOption
} from './mocha-call-allowance.ts';

export const noHooksRule: Readonly<Rule.RuleModule> = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow hooks',
            recommended: false,
            url: 'https://github.com/lo1tuma/eslint-plugin-mocha/blob/main/documentation/rules/no-hooks.md'
        },
        schema: [ allowMochaCallOptionSchema ],
        defaultOptions: [ defaultAllowMochaCallOption ],
        messages: {
            unexpectedHook: 'Unexpected use of Mocha `{{name}}` hook'
        },
        languages: [ 'js/js' ]
    },

    create(context) {
        const { allow } = getRuleOption<ResolvedAllowMochaCallOption>(context);
        const allowList = new Set(allow.map(normalizeMochaCallName));

        return createMochaVisitors(context, {
            hook(visitorContext) {
                const isHookAllowed = allowList.has(visitorContext.name);

                if (!isHookAllowed) {
                    context.report({
                        node: visitorContext.node,
                        messageId: 'unexpectedHook',
                        data: { name: visitorContext.name }
                    });
                }
            }
        });
    }
};
