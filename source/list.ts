export function flatMapWithArgs<ListItem, MappedReturnValue, Args extends readonly unknown[]>(list: readonly ListItem[], callback: (item: ListItem, ...args: Args) => readonly MappedReturnValue[], ...args: Args): readonly MappedReturnValue[] {
    const result = [];

    for (const item of list) {
        const itemResults = callback(item, ...args);
        for (const itemResult of itemResults) {
            result.push(itemResult);
        }
    }

    return result;
}

export function mapWithArgs<ListItem, MappedReturnValue, Args extends readonly unknown[]>(list: readonly ListItem[], callback: (item: ListItem, ...args: Args) => MappedReturnValue, ...args: Args): readonly MappedReturnValue[] {
    const result: MappedReturnValue[] = Array.from({ length: list.length });

    for (const [index, item] of list.entries()) {
        const itemResults = callback(item, ...args);
        result[index] = itemResults;
    }

    return result;
}

export function filterWithArgs<ListItem, Args extends readonly unknown[]>(list: readonly ListItem[], callback: (item: ListItem, ...args: Args) => boolean, ...args: Args): readonly ListItem[] {
    const result = [];

    for (const item of list) {
        if (callback(item, ...args)) {
            result.push(item);
        }
    }

    return result;
}

export function reduceWithArgs<ListItem, Accumulator, Args extends readonly unknown[]>(
    list: readonly ListItem[],
    callback: (accumulator: Accumulator, item: ListItem, ...args: Args) => Accumulator,
    initialValue: Accumulator,
    ...args: Args
): Accumulator {
    let accumulator = initialValue;

    for (const item of list) {
        accumulator = callback(accumulator, item, ...args);
    }

    return accumulator;
}

