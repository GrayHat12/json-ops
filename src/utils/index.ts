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

export function hashCode(s: string) {
    for (var i = 0, h = 0; i < s.length; i++)
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
    }.bind(cache);
}

// export const memoizedHash = memoized(hashCode, 1000);

export function normalizeArray(objects: any[], baseKey = "$") {
    let normalized: { [key: string]: any } = {};
    if (!baseKey.endsWith(".")) {
        baseKey += ".";
    }
    // await Promise.all(objects.map(async (object: any, index: number) => {
    //     if (isPlainObject(object)) {
    //         for (let [key, value] of Object.entries(await normalizeObject(object, `${baseKey}[${index}]`))) {
    //             normalized[key] = value;
    //         }
    //         // normalized = {
    //         //     ...normalized,
    //         //     ...await normalizeObject(object, `${baseKey}[${index}]`),
    //         // };
    //     } else if (isArray(object)) {
    //         for (let [key, value] of Object.entries(await normalizeArray(object, `${baseKey}[${index}]`))) {
    //             normalized[key] = value;
    //         }
    //         // normalized = {
    //         //     ...normalized,
    //         //     ...await normalizeArray(object, `${baseKey}[${index}]`),
    //         // };
    //     } else {
    //         // normalized.set(`${baseKey}[${index}]`, object);
    //         normalized[`${baseKey}[${index}]`] = object;
    //     }
    // }));
    objects.forEach((object: any, index: number) => {
        if (isPlainObject(object)) {
            for (let [key, value] of Object.entries(normalizeObject(object, `${baseKey}[${index}]`))) {
                normalized[key] = value;
            }
            // normalized = {
            //     ...normalized,
            //     ...await normalizeObject(object, `${baseKey}[${index}]`),
            // };
        } else if (isArray(object)) {
            for (let [key, value] of Object.entries(normalizeArray(object, `${baseKey}[${index}]`))) {
                normalized[key] = value;
            }
            // normalized = {
            //     ...normalized,
            //     ...await normalizeArray(object, `${baseKey}[${index}]`),
            // };
        } else {
            // normalized.set(`${baseKey}[${index}]`, object);
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
    // await Promise.all(Object.keys(object).map(async (key: string) => {
    //     let newkey = key.replace("'", "\\'").replace('"', '\\"');
    //     if (newkey.includes(".")) {
    //         newkey = `"${newkey}"`;
    //     }
    //     if (isPlainObject(object[key])) {
    //         let norchild = await normalizeObject(object[key], `${baseKey}${newkey}`);
    //         for (let [key, value] of Object.entries(norchild)) {
    //             normalized[key] = value;
    //         }
    //         // normalized = {
    //         //     ...normalized,
    //         //     ...norchild
    //         // };
    //         // normalized[`${baseKey}${newkey}`] = memoizedHash(JSON.stringify(norchild));
    //     } else if (isArray(object[key])) {
    //         let norchild = await normalizeArray(object[key], `${baseKey}${newkey}`);
    //         for (let [key, value] of Object.entries(norchild)) {
    //             normalized[key] = value;
    //         }
    //         // normalized = {
    //         //     ...normalized,
    //         //     ...norchild,
    //         // };
    //         // normalized[`${baseKey}${newkey}`] = memoizedHash(JSON.stringify(norchild));
    //     } else {
    //         normalized[`${baseKey}${newkey}`] = object[key];
    //     }
    // }));
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
            // normalized[`${baseKey}${newkey}`] = hashCode(JSON.stringify(norchild));
        } else if (isArray(object[key])) {
            let norchild = normalizeArray(object[key], `${baseKey}${newkey}`);
            normalized = {
                ...normalized,
                ...norchild,
            };
            // normalized[`${baseKey}${newkey}`] = hashCode(JSON.stringify(norchild));
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
        // let tasks: Promise<any>[] = [normalize(jsona), normalize(jsonb)];
        let normalizedA = normalize(jsona);
        let normalizedB = normalize(jsonb);
        // let [normalizedA, normalizedB] = await Promise.all(tasks);
        // tasks = [];
        console.log('Normalized');
        // console.log(normalizedA, normalizedB);
        // tasks = [...Object.keys(normalizedA).map(async (key: string) => {
        //     let keyinb = key in normalizedB;
        //     if (keyinb) {
        //         if (normalizedA[key] !== normalizedB[key]) {
        //             diff.left.different.push(key);
        //         }
        //     } else {
        //         diff.left.missing.push(key);
        //     }
        // })];
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
        // tasks = tasks.concat([...Object.keys(normalizedB).map(async (key: string) => {
        //     let keyina = key in normalizedA;
        //     if (keyina) {
        //         if (normalizedA[key] !== normalizedB[key]) {
        //             diff.right.different.push(key);
        //         }
        //     } else {
        //         diff.right.extra.push(key);
        //     }
        // })]);
        // await Promise.all(tasks);
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

export function differenceV2(jsona: any, jsonb: any, baseKey: string = "$") {
    if (!baseKey.endsWith(".")) {
        baseKey += ".";
    }
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

    if (isPlainObject(jsona) && isPlainObject(jsonb)) {
        Object.keys(jsona).forEach(keya => {
            let newkey = keya.replace("'", "\\'").replace('"', '\\"');
            if (newkey.includes(".")) {
                newkey = `"${newkey}"`;
            }
            let path = `${baseKey}${newkey}`;
            if (typeof jsonb[keya] !== "undefined") {
                let vala = jsona[keya];
                let valb = jsonb[keya];
                if (typeof vala !== typeof valb) {
                    diff.left.different.push(path);
                    diff.right.different.push(path);
                } else if ((isPlainObject(vala) && isPlainObject(valb)) || (isArray(vala) && isArray(valb))) {
                    let _diff = differenceV2(vala, valb, path);
                    diff.left.different = diff.left.different.concat(_diff.left.different);
                    diff.right.different = diff.right.different.concat(_diff.right.different);
                    diff.left.extra = diff.left.extra.concat(_diff.left.extra);
                    diff.right.extra = diff.right.extra.concat(_diff.right.extra);
                    diff.left.missing = diff.left.missing.concat(_diff.left.missing);
                    diff.right.missing = diff.right.missing.concat(_diff.right.missing);
                } else if (vala !== valb) {
                    diff.left.different.push(path);
                    diff.right.different.push(path);
                }
            }
            else {
                diff.left.missing.push(path);
                // diff.right.extra.push(path);
            }
        });
        Object.keys(jsonb).forEach(keyb => {
            let newkey = keyb.replace("'", "\\'").replace('"', '\\"');
            if (newkey.includes(".")) {
                newkey = `"${newkey}"`;
            }
            let path = `${baseKey}${newkey}`;
            if (typeof jsona[keyb] === "undefined") {
                diff.right.extra.push(path);
            }
        });
    } else if (isArray(jsona) && isArray(jsonb)) {
        for (let i = 0; i < jsona.length; i++) {
            let path = `${baseKey}.[${i}]`;
            let vala = jsona[i];
            let valb = jsonb[i];
            if (typeof vala !== typeof valb) {
                diff.left.different.push(path);
                diff.right.different.push(path);
            } else if ((isPlainObject(vala) && isPlainObject(valb)) || (isArray(vala) && isArray(valb))) {
                let _diff = differenceV2(vala, valb, path);
                diff.left.different = diff.left.different.concat(_diff.left.different);
                diff.right.different = diff.right.different.concat(_diff.right.different);
                diff.left.extra = diff.left.extra.concat(_diff.left.extra);
                diff.right.extra = diff.right.extra.concat(_diff.right.extra);
                diff.left.missing = diff.left.missing.concat(_diff.left.missing);
                diff.right.missing = diff.right.missing.concat(_diff.right.missing);
            } else if (vala !== valb) {
                diff.left.different.push(path);
                diff.right.different.push(path);
            }
        }
        for (let i = jsona.length; i < jsonb.length; i++) {
            let path = `${baseKey}.[${i}]`;
            diff.right.extra.push(path);
        }
    } else {
        throw Error("Invalid input JSON");
    }
    return diff;
}