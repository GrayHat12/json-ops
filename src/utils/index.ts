// Is a value an array?
export function isArray<T>(val: T) {
    return Object.prototype.toString.call(val) === "[object Array]";
}

// Is a value an Object?
export function isPlainObject<T>(val: T) {
    return Object.prototype.toString.call(val) === "[object Object]";
}

export interface JSONDiff {
    different: string[];
    extra: string[];
    missing: string[];
}

export interface Difference {
    left: JSONDiff;
    right: JSONDiff;
}

export function cyrb53(str: string, seed: number = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    // console.log(str);
    for (let i = 0, ch: number; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function hashCode(s: string) {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
}

export function memoized<Callable extends (...args: any) => any>(functionToMemoize: Callable, max_size = 10) {

    let cache: {
        [key: string]: {
            value: ReturnType<Callable>, lastAccessed: Date
        }
    } = {};
    return function (...args: Parameters<Callable>): ReturnType<Callable> {
        let key = JSON.stringify(args || "");
        if (key in cache) {
            cache[key].lastAccessed = new Date();
            return cache[key].value;
        } else {
            let value = functionToMemoize(...Array.from(args));
            if (Object.keys(cache).length >= max_size) {
                let firstAccessedKey = Object.keys(cache).sort((a, b) => cache[a].lastAccessed.getTime() - cache[b].lastAccessed.getTime())[0];
                delete cache[firstAccessedKey];
            }
            cache[key] = {
                value,
                lastAccessed: new Date()
            };
            return value;
        }
    }
}

export const memoizedHash = memoized(hashCode, 2);

export function normalizeArray(objects: any[], baseKey = "$") {
    let normalized: { [key: string]: any } = {};
    if (!baseKey.endsWith(".")) {
        baseKey += ".";
    }
    objects.forEach((object: any, index: number) => {
        if (isPlainObject(object)) {
            normalized = {
                ...normalized,
                ...normalizeObject(object, `${baseKey}[${index}]`),
            };
        } else if (isArray(object)) {
            normalized = {
                ...normalized,
                ...normalizeArray(object, `${baseKey}[${index}]`),
            };
        } else {
            normalized[`${baseKey}[${index}]`] = object;
        }
    });
    return normalized;
}
export function normalizeObject(object: any, baseKey = "$") {
    let normalized: { [key: string]: any } = {};
    if (!baseKey.endsWith(".")) {
        baseKey += ".";
    }
    Object.keys(object).forEach((key: string) => {
        let newkey = key.replace("'", "\\'").replace('"', '\\"');
        if (newkey.includes(".")) {
            newkey = `"${newkey}"`;
        }
        if (isPlainObject(object[key])) {
            let norchild = normalizeObject(object[key], `${baseKey}${newkey}`);
            normalized = {
                ...normalized,
                ...norchild
            };
            normalized[`${baseKey}${newkey}`] = memoizedHash(JSON.stringify(norchild));
        } else if (isArray(object[key])) {
            let norchild = normalizeArray(object[key], `${baseKey}${newkey}`);
            normalized = {
                ...normalized,
                ...norchild,
            };
            normalized[`${baseKey}${newkey}`] = memoizedHash(JSON.stringify(norchild));
        } else {
            normalized[`${baseKey}${newkey}`] = object[key];
        }
    });
    return normalized;
}

export function normalize(json: any, root = "$") {
    if (isArray(json)) {
        return normalizeArray(json, root);
    } else if (isPlainObject(json)) {
        return normalizeObject(json, root);
    } else {
        return json;
    }
}

export function difference(jsona: any, jsonb: any) {
    if ((isPlainObject(jsona) || isArray(jsona)) && (isPlainObject(jsonb) || isArray(jsonb))) {
        let diff: Difference = {
            left: {
                different: [],
                extra: [],
                missing: [],
            },
            right: {
                different: [],
                extra: [],
                missing: []
            },
        };
        let normalizedA = normalize(jsona);
        let normalizedB = normalize(jsonb);
        console.log(normalizedA, normalizedB);
        Object.keys(normalizedA).forEach((key: string) => {
            let keyinb = key in normalizedB;
            if (keyinb) {
                if (normalizedA[key] !== normalizedB[key]) {
                    diff.left.different.push(key);
                }
            } else {
                diff.left.missing.push(key);
            }
        });
        Object.keys(normalizedB).forEach((key: string) => {
            let keyina = key in normalizedA;
            if (keyina) {
                if (normalizedA[key] !== normalizedB[key]) {
                    diff.right.different.push(key);
                }
            } else {
                diff.right.extra.push(key);
            }
        });
        return diff;
    } else {
        return null;
    }
}
