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
            normalized = {
                ...normalized,
                ...normalizeObject(object[key], `${baseKey}${newkey}`),
            };
        } else if (isArray(object[key])) {
            normalized = {
                ...normalized,
                ...normalizeArray(object[key], `${baseKey}${newkey}`),
            };
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
