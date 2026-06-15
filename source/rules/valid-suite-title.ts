import type { Rule } from 'eslint';
import { createSuiteTitlePatternRule } from '../title-pattern-rule.ts';

export const validSuiteTitleRule: Readonly<Rule.RuleModule> = {
    ...createSuiteTitlePatternRule({
        defaultPattern: '',
        description: 'Require suite descriptions to match a pre-configured regular expression',
        documentationFile: 'valid-suite-title',
        messageId: 'invalidSuiteTitle'
    })
};
