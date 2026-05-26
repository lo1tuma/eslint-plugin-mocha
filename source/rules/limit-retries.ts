import { createSimpleNumericMochaConfigLimitRule } from './mocha-config-value-rule.js';

export const limitRetriesRule = createSimpleNumericMochaConfigLimitRule({
    configName: 'retries',
    description: 'Enforce limits for Mocha retries',
    messageIds: {
        aboveMax: 'unexpectedRetriesAboveMax',
        disallow: 'unexpectedRetries',
        outsideRange: 'unexpectedRetriesOutsideRange'
    },
    messages: {
        unexpectedRetries: 'Unexpected use of Mocha retry configuration.',
        unexpectedRetriesAboveMax: 'Unexpected Mocha retry value {{value}}. Maximum allowed is {{max}}.',
        unexpectedRetriesOutsideRange:
            'Unexpected Mocha retry value {{value}}. Expected a value between {{min}} and {{max}}.'
    },
    name: 'limit-retries'
});
