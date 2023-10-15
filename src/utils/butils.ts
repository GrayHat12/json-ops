import { JSONPath } from "vanilla-jsoneditor";

export function isNumericString(value: string) {
    return /^\d+$/.test(value);
}

export function parseJSONPath(path: string): JSONPath {
    let parsed: JSONPath = [];
    let start_index = 0;
    let index = 0;
    while (index < path.length) {
        let char = path[index];
        switch (char) {
            case ".": {
                if (index > start_index) {
                    parsed.push(path.slice(start_index, index));
                    index += 1;
                    start_index = index;
                } else {
                    // console.log('skipping', path, char);
                    index += 1;
                }
            } break;
            case "]": {
                if (path[start_index] === '[' && path[index + 1] === '.') {
                    let key = path.slice(start_index+1, index);
                    if (isNumericString(key)) {
                        parsed.push(key);
                        index += 2;
                        start_index = index;
                    }
                    else {
                        index += 1;
                    }
                }
                else {
                    index += 1;
                }
            } break;
            case '"': {
                let start = index+1;
                let end = path.indexOf('"', start);
                if (path.length > end+1 && path[end+1] === '.') {
                    parsed.push(path.slice(start, end));
                    index = end+2;
                    start_index = index;
                } else if (path.length == end+1) {
                    parsed.push(path.slice(start, end));
                    index = end+2;
                    start_index = index;
                } else {
                    index = end+1;
                }
            } break;
            case '\\': {
                index += 2;
            } break;
            default: {
                index += 1;
            } break;
        }
    }
    if (start_index < path.length) {
        parsed.push(path.slice(start_index));
    }
    // console.log('processing', path, 'returned', parsed, start_index);
    return parsed;
}