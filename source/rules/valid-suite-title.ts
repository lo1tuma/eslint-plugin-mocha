import type { Rule } from 'eslint';
import { createTitlePatternRule } from '../title-pattern-rule.js';

export const validSuiteTitleRule: Readonly<Rule.RuleModule> = {
    ...createTitlePatternRule({
        defaultPattern: '',
        description: 'Require suite descriptions to match a pre-configured regular expression',
        documentationFile: 'valid-suite-title',
        messageId: 'invalidSuiteTitle',
        target: 'suite'
    })
};
