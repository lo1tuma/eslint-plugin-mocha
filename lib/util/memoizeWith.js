/** Memoize a function using a custom cache and a key formatter
 *
 * (rambda does not include a memoizeWith function)
 *
 * @param {Function} keyGen The function to generate the cache key.
 * @param {Function} fn The function to memoize.
 * @return {Function} Memoized version of `fn`.
 */
export const memoizeWith = (keyGen, fn) => {
    const cache = new Map();

    return function (...args) {
        const key = keyGen(...args);

        if (!cache.has(key)) {
            cache.set(key, Reflect.apply(fn, this, args));
        }

        return cache.get(key);
    };
};
