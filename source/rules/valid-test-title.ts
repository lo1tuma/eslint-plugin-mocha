import type { Rule } from 'eslint';
import { createTitlePatternRule } from '../title-pattern-rule.js';

export const validTestTitleRule: Readonly<Rule.RuleModule> = {
    ...createTitlePatternRule({
        defaultPattern: '^should',
        description: 'Require test descriptions to match a pre-configured regular expression',
        documentationFile: 'valid-test-title',
        messageId: 'invalidTestTitle',
        target: 'testCase'
    })
};
