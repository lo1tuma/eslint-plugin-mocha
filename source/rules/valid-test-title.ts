import type { Rule } from 'eslint';
import { createTestCaseTitlePatternRule } from '../title-pattern-rule.js';

export const validTestTitleRule: Readonly<Rule.RuleModule> = {
    ...createTestCaseTitlePatternRule({
        defaultPattern: '^should',
        description: 'Require test descriptions to match a pre-configured regular expression',
        documentationFile: 'valid-test-title',
        messageId: 'invalidTestTitle'
    })
};
