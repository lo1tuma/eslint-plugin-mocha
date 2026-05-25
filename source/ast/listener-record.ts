import type { Rule } from 'eslint';

export function createListenerRecord<Name extends keyof Rule.RuleListener>(
    name: Name,
    listener: Rule.RuleListener[Name]
): Partial<Rule.RuleListener> {
    const listeners: Partial<Rule.RuleListener> = {};

    if (listener !== undefined) {
        listeners[name] = listener;
    }

    return listeners;
}
