import { createSimpleNumericMochaConfigLimitRule } from './mocha-config-value-rule.js';

export const limitSlowRule = createSimpleNumericMochaConfigLimitRule({
    configName: 'slow',
    description: 'Enforce limits for Mocha slow thresholds',
    messageIds: {
        aboveMax: 'unexpectedSlowAboveMax',
        disallow: 'unexpectedSlow',
        outsideRange: 'unexpectedSlowOutsideRange'
    },
    messages: {
        unexpectedSlow: 'Unexpected use of Mocha slow threshold configuration.',
        unexpectedSlowAboveMax: 'Unexpected Mocha slow value {{value}}. Maximum allowed is {{max}}.',
        unexpectedSlowOutsideRange:
            'Unexpected Mocha slow value {{value}}. Expected a value between {{min}} and {{max}}.'
    },
    name: 'limit-slow'
});
