export function flatMapWithArgs(list, callback, ...args) {
    const result = [];

    for (const item of list) {
        const itemResults = callback(...args, item);
        for (const itemResult of itemResults) {
            result.push(itemResult);
        }
    }

    return result;
}

export function mapWithArgs(list, callback, ...args) {
    const result = Array.from({ length: list.length });

    for (const [index, item] of list.entries()) {
        const itemResults = callback(...args, item);
        result[index] = itemResults;
    }

    return result;
}

export function filterWithArgs(list, callback, ...args) {
    const result = [];

    for (const item of list) {
        if (callback(...args, item)) {
            result.push(item);
        }
    }

    return result;
}

export function reduceWithArgs(list, callback, initialValue, ...args) {
    let accumulator = initialValue;
    for (const [index, item] of list.entries()) {
        accumulator = callback(...args, accumulator, item, index);
    }
    return accumulator;
}
