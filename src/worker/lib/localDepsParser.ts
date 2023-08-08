import { isPlainObject } from "../../utils";

const localDepsParser = (deps: () => { [key: symbol]: unknown }): string => {
    // if (deps.length === 0) return '';

    let script = '';
    // console.log(deps());
    for (let [key, value] of Object.entries(deps())) {
        if (isPlainObject(value)) {
            script += `const ${key} = ${JSON.stringify(value)};\n`;
        } else if (typeof value === "function") {
            // console.log('got', value.name, value);
            // Commented the if block below because it was causing issues when code was minified
            // if (value.name != key) {
            //     script += `const ${key} = ${value};\n`;
            // } else {
                script += `${value.toString()};\n`;
            // }
        } else {
            script += `const ${key} = ${value.toString()};\n`;
        }
    }

    const blob = new Blob([script], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob);

    // const depsString = (deps.map(dep => `'${dep}'`)).toString()
    // return `importScripts(['${url}'])`;
    return script;
}

export default localDepsParser;