import { Button, Container, Text, useInput } from "@nextui-org/react";
import JSONPane from "../components/JsonPane";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { _IDBStorageItem, useAppContext } from "../context/AppContext";
import { JSONEditor, Content, Mode, OnChangeStatus, parseJSONPath, JSONPath } from "vanilla-jsoneditor";
import Loading from "./Loading";
import { BiSolidUpArrow, BiSolidDownArrow } from "react-icons/bi";
import { sortObj, cleanJSON } from "jsonabc";
import styles from "./compare.module.css";
import { JSONDiff, Difference, difference } from "../utils";
import * as utils from "../utils";
import { useWorker, WORKER_STATUS } from "../worker";

let highlightJobInterval: number | undefined = undefined;
let differencerInterval: number | undefined = undefined;
let uniqueDifferenceInterval: number | undefined = undefined;

function getStylesElement(id: string) {
    let styleElement = document.getElementById(id);
    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = id;
    }
    return styleElement;
}

function saveStyleElement(element: HTMLElement) {
    let existing = document.getElementById(element.id);
    if (existing) {
        existing.innerHTML = element.innerHTML;
    } else {
        document.head.appendChild(element);
    }
}

function uniqueDifferenceFunction(differenceObject: Difference) {
    let left = differenceObject.left;
    let right = differenceObject.right;
    let uniques: { pathLeft?: string; pathRight?: string; }[] = [];
    // let tasks: Promise<void>[] = [];
    // console.log("Finding unique difference", left, right);
    // let a = left.different.filter(async (x, index) => !left.different.find((y, _index) => y.startsWith(x) && index != _index));
    // tasks = [...tasks, ...left.different.filter((x, index) => !left.different.find((y, _index) => y.startsWith(x) && index != _index)).map(async (path) => {
    //     if (right.different.includes(path)) {
    //         uniques.push({ pathLeft: path, pathRight: path });
    //     }
    // })];
    left.different.filter((x, index) => !left.different.find((y, _index) => y.startsWith(x) && index != _index)).forEach((path) => {
        if (right.different.includes(path)) {
            uniques.push({ pathLeft: path, pathRight: path });
        }
    });
    // tasks = [...tasks, ...left.extra.map(async (path) => {
    //     if (!right.extra.includes(path)) {
    //         uniques.push({ pathLeft: path });
    //     }
    // })];
    left.extra.forEach((path) => {
        if (!right.extra.includes(path)) {
            uniques.push({ pathLeft: path });
        }
    });
    // tasks = [...tasks, ...right.extra.map(async (path) => {
    //     if (!left.extra.includes(path)) {
    //         uniques.push({ pathRight: path });
    //     }
    // })];
    right.extra.forEach((path) => {
        if (!left.extra.includes(path)) {
            uniques.push({ pathRight: path });
        }
    });
    // await Promise.all(tasks);
    // if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
    uniqueDifferenceInterval = undefined;
    // setUniqueDiff(uniques);
    // setCurrentDifferenceIndex(uniques.length === 0 ? 0 : 1);
    return { uniques, index: uniques.length === 0 ? 0 : 1 };
}

const STYLE_ID = "jsoneditor-styles-custom";

function generateStyles(editorid: string, classNames: {[classname: string]: string[]}) {
    let style2 = `
    color: #292D1C !important;
    --jse-key-color: #292D1C !important;
    background-color: var(--background-color-custom) !important;`;
    let style3 = `
    color: #292D1C !important;
    --jse-selection-background-inactive-color: var(--background-color-custom) !important;
    `;
    let style1Values: {[classname: string]: string[]} = {};
    // let style1Selectors:string[] = [];
    let style2Selectors:string[] = [];
    let style3Selectors:string[] = [];
    Object.keys(classNames).forEach(className => {
        style1Values[className] = [];
        classNames[className].forEach(datapath => {
            let selector = `#${editorid} div[data-path="${datapath}"]`;
            // style1Selectors.push(selector);
            style1Values[className].push(selector);
            style2Selectors.push(selector + '>div:first-child>div');
            style3Selectors.push(selector + ':first-child');
        });
    });
    style2 = `${style2Selectors.join(', ')}{${style2}}`;
    style3 = `${style3Selectors.join(', ')}{${style3}}`;
    let style1s = Object.keys(style1Values).map(className => {
        let selectors = style1Values[className];
        let val = `--background-color-custom: ${className == styles.different ? "#F6D283" : className == styles.extra ? "#C5DA8B" : "#ED8373"};`
        return `${selectors.join(', ')}{${val}}`;
    });
    return style1s.join('\n') + '\n' + style2 + '\n' + style3;
    // let style = `
    //     #${editorid} div[data-path="${datapath}"] {
    //         --background-color-custom: ${className == styles.different ? "#F6D283" : className == styles.extra ? "#C5DA8B" : "#ED8373"};
    //     }
    //     #${editorid} div[data-path="${datapath}"]>div:first-child>div {
    //         color: #292D1C !important;
    //         --jse-key-color: #292D1C !important;
    //         background-color: var(--background-color-custom) !important;
    //     }
    //     #${editorid} div[data-path="${datapath}"]:first-child {
    //         color: #292D1C !important;
    //         --jse-selection-background-inactive-color: var(--background-color-custom) !important;
    //     }
    //     `;
}

export default function Compare() {
    const [title, setTitle] = useState<string>("");
    const [assignedId, setAssignedId] = useState<number>();
    const [uniqueDiff, setUniqueDiff] = useState<{ pathLeft?: string; pathRight?: string }[]>([]);
    const [differenceObject, setDifference] = useState<Difference | null>(null);
    const [leftMode, setLeftMode] = useState<Mode>(Mode.tree);
    const [rightMode, setRightMode] = useState<Mode>(Mode.tree);
    const [currentDifferenceIndex, setCurrentDifferenceIndex] = useState<number>(0);
    const [loadingState, setLoadingState] = useState<boolean>(false);
    const [uniqueDifferenceWorker, { status: differenceWorkerStatus, kill: killDifferenceWorker }] = useWorker(uniqueDifferenceFunction);
    const [differenceFinderWorker, { status: differenceFinderWorkerStatus, kill: killDifferenceFinderWorker }] = useWorker(difference, {
        localDependencies() {
            return { ...utils, cache: {} }
        },
    });

    const leftRefEditor = useRef<JSONEditor>();
    const rightRefEditor = useRef<JSONEditor>();
    const leftId = "left-pane";
    const rightId = "right-pane";

    const {
        value: leftTitle,
        setValue: setLeftTitle,
        reset: resetLeftTitle,
        bindings: bindingsLeftTitle,
    } = useInput("Sample 1");
    const {
        value: rightTitle,
        setValue: setRightTitle,
        reset: resetRightTitle,
        bindings: bindingsRightTitle,
    } = useInput("Sample 2");

    const { getComparison, loading } = useAppContext();
    const [functionsToRunAfterRender, setFunctionsToRunAfterRender] = useState<
        ((left: JSONEditor, right: JSONEditor) => void)[]
    >([]);

    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (id === undefined) {
            navigate("/compare/new");
            return;
        }
        if (!leftRefEditor.current || !rightRefEditor.current) {
            return;
        }
        let id_as_number = parseInt(id);
        if (isNaN(id_as_number)) {
            navigate("/compare/new");
            return;
        }
        getComparison(id_as_number)
            .then((data) => {
                if (!data) {
                    navigate("/compare/new");
                    return;
                }
                setTitle(data.title);
                setAssignedId(data.id);
                setFunctionsToRunAfterRender((prev) => [
                    ...prev,
                    (left, right) => {
                        left.set(data.data.json_left.data);
                        right.set(data.data.json_right.data);
                    },
                ]);
                setLeftTitle(data.data.json_left.title);
                setRightTitle(data.data.json_right.title);
            })
            .catch((err) => {
                console.error(err);
                navigate("/");
            });
    }, [id]);

    function differenceFinderRunner(leftjson: any, rightjson: any) {
        console.log('Running difference finder function runner', differenceFinderWorkerStatus);
        if (differenceFinderWorkerStatus === WORKER_STATUS.RUNNING) {
            console.log('Killing previous difference finder worker');
        }
        killDifferenceFinderWorker();
        if (leftjson && rightjson) {
            console.log("Finding difference");
            // setLoadingState(true);
            console.log('Starting difference finder worker');
            differenceFinderWorker(leftjson, rightjson).then(_diff => {
                setDifference(_diff);
                console.log("Difference found");
            }).catch(err => {
                console.error(err);
                console.log("Error finding difference");
                setDifference(null);
            }).finally(() => {
                // setLoadingState(false);
                if (differencerInterval) clearInterval(differencerInterval);
            });
        } else {
            setDifference(null);
        }
    }

    function onChange() {
        console.log("Running onChange");
        if (!leftRefEditor.current || !rightRefEditor.current) {
            return;
        }
        let left = leftRefEditor.current.get() as any;
        let right = rightRefEditor.current.get() as any;
        let leftjson = left.json;
        let rightjson = right.json;
        if (!leftjson) {
            try {
                leftjson = JSON.parse(left.text);
            } catch (err) { }
        }
        if (!rightjson) {
            try {
                rightjson = JSON.parse(right.text);
            } catch (err) { }
        }
        if (differencerInterval) {
            clearInterval(differencerInterval);
            differencerInterval = undefined;
        }
        differenceFinderRunner(leftjson, rightjson);
    }

    function onLeftChange(content: Content, previousContent: Content, status: OnChangeStatus) {
        console.log("left change", content, previousContent, status);
        if (!status.contentErrors) onChange();
    }
    function onRightChange(content: Content, previousContent: Content, status: OnChangeStatus) {
        console.log("right change", content, previousContent, status);
        if (!status.contentErrors) onChange();
    }

    function clearPreviousDifference() {
        let styleElement = getStylesElement(STYLE_ID);
        styleElement.innerHTML = "";
        saveStyleElement(styleElement);
    }

    function highlightPath(path: JSONPath) {
        let fn = async (p: JSONPath) => {
            return `%2F${p.join("%2F")}`;
        };
        let styleRules: Promise<string>[] = [];
        while (path.length > 0) {
            styleRules.push(fn(path));
            path.pop();
        }
        return Promise.all(styleRules);
    }

    async function highlightDifference(sideDiff: JSONDiff, returnable: JSONEditor) {
        let tasks: ReturnType<typeof highlightPath>[] = [];
        // let styleRules: string[] = [];
        for (let i = 0; i < sideDiff.different.length; i++) {
            let path = sideDiff.different[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path));
        }
        for (let i = 0; i < sideDiff.extra.length; i++) {
            let path = sideDiff.extra[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path));
        }
        for (let i = 0; i < sideDiff.missing.length; i++) {
            let path = sideDiff.missing[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path));
        }
        let styleRules = await Promise.all(tasks);
        let result = [
            {
                style: styles.different,
                paths: styleRules.slice(0, sideDiff.different.length).flat(),
            },
            {
                style: styles.extra,
                paths: styleRules.slice(sideDiff.different.length, sideDiff.different.length + sideDiff.extra.length).flat(),
            },
            {
                style: styles.missing,
                paths: styleRules.slice(sideDiff.different.length + sideDiff.extra.length).flat(),
            },
        ];
        returnable.refresh();
        return { result, returnable };
    }

    useEffect(() => {
        // console.log("Running useEffect");
        if (highlightJobInterval) clearInterval(highlightJobInterval);
        highlightJobInterval = setInterval(regularHighlightJob, 100);
        return () => {
            if (highlightJobInterval) clearInterval(highlightJobInterval);
        };
    }, [differenceObject]);

    function uniqueDifferenceFunctionRunner() {
        console.log('Running unique difference function runner', differenceWorkerStatus);
        if (differenceWorkerStatus === WORKER_STATUS.RUNNING) {
            console.log('Killing previous difference worker');

        }
        killDifferenceWorker();
        console.log('Starting unique difference worker');
        uniqueDifferenceWorker(differenceObject).then(result => {
            setUniqueDiff(result.uniques);
            setCurrentDifferenceIndex(result.index);
        }).catch(console.error).finally(() => {
            if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
        });
    }

    useEffect(() => {
        if (!differenceObject) {
            setUniqueDiff([]);
            return;
        }
        if (uniqueDifferenceInterval) {
            clearInterval(uniqueDifferenceInterval);
        }
        uniqueDifferenceInterval = setInterval(uniqueDifferenceFunctionRunner, 20);
        return () => {
            if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
        };
    }, [differenceObject]);

    useEffect(() => {
        killDifferenceWorker();
        killDifferenceFinderWorker();
    }, [killDifferenceFinderWorker, killDifferenceWorker]);

    async function regularHighlightJob() {
        console.log("Running regular highlight job");
        let styleElement = document.createElement('style');
        clearPreviousDifference();
        if (!differenceObject) {
            console.log("cleared interval");
            clearInterval(highlightJobInterval);
            highlightJobInterval = undefined;
            return;
        }
        let tasks: ReturnType<typeof highlightDifference>[] = [];
        if (differenceObject.left && leftRefEditor.current) {
            console.log("highlighting difference left");
            tasks.push(highlightDifference(differenceObject.left, leftRefEditor.current));
        }
        if (differenceObject.right && rightRefEditor.current) {
            console.log("highlighting difference right");
            tasks.push(highlightDifference(differenceObject.right, rightRefEditor.current));
        }
        try {
            styleElement.id = STYLE_ID;
            let [leftStyle, rightStyle] = await Promise.all(tasks);
            let returnables = [leftStyle.returnable, rightStyle.returnable];
            let leftcss = generateStyles(leftId, {
                [styles.different]: leftStyle.result.find((x) => x.style === styles.different)?.paths || [],
                [styles.extra]: leftStyle.result.find((x) => x.style === styles.extra)?.paths || [],
                [styles.missing]: leftStyle.result.find((x) => x.style === styles.missing)?.paths || [],
            });
            let rightcss = generateStyles(rightId, {
                [styles.different]: rightStyle.result.find((x) => x.style === styles.different)?.paths || [],
                [styles.extra]: rightStyle.result.find((x) => x.style === styles.extra)?.paths || [],
                [styles.missing]: rightStyle.result.find((x) => x.style === styles.missing)?.paths || [],
            });
            styleElement.innerHTML = leftcss + '\n' + rightcss;
            saveStyleElement(styleElement);
            returnables.forEach((x) => x.refresh());
        } catch (e) {
            console.error(e);
        }
        console.log("cleared regularHighlight interval", highlightJobInterval);
        clearInterval(highlightJobInterval);
        highlightJobInterval = undefined;
        // return Promise.all(tasks);
    }

    useEffect(() => {
        if (!leftRefEditor.current || !rightRefEditor.current) {
            return;
        }
        if (functionsToRunAfterRender.length === 0) {
            return;
        }
        console.log("Running functions after render");
        functionsToRunAfterRender.forEach((fn) => fn(leftRefEditor.current!, rightRefEditor.current!));
        return () => {
            setFunctionsToRunAfterRender([]);
        };
    }, [leftRefEditor.current, rightRefEditor.current, functionsToRunAfterRender]);

    function sortLeft() {
        if (!leftRefEditor.current) return;
        let content = leftRefEditor.current.get();
        let json = (content as any).json;
        if (!json) {
            try {
                json = JSON.parse((content as any).text);
            } catch (err) {
                console.error(err);
                return;
            }
        }
        if (!json) return;
        try {
            let data = JSON.parse(cleanJSON(JSON.stringify(json)));
            let sorted = sortObj(data);
            // leftRefEditor.current.set({ json: sorted });
            if (leftMode == Mode.text) {
                leftRefEditor.current.set({ text: JSON.stringify(sorted) });
            } else if (leftMode == Mode.tree) {
                leftRefEditor.current.set({ json: sorted });
            }
            onLeftChange({ json: sorted }, { json: data }, { contentErrors: null, patchResult: null });
        } catch (err) {
            console.error(err);
            return;
        }
    }

    function sortRight() {
        if (!rightRefEditor.current) return;
        let content = rightRefEditor.current.get();
        let json = (content as any).json;
        if (!json) {
            try {
                json = JSON.parse((content as any).text);
            } catch (err) {
                console.error(err);
                return;
            }
        }
        if (!json) return;
        try {
            let data = JSON.parse(cleanJSON(JSON.stringify(json)));
            let sorted = sortObj(data);
            // rightRefEditor.current.set({ json: sorted });
            if (rightMode == Mode.text) {
                rightRefEditor.current.set({ text: JSON.stringify(sorted) });
            } else if (rightMode == Mode.tree) {
                rightRefEditor.current.set({ json: sorted });
            }
            onRightChange({ json: sorted }, { json: data }, { contentErrors: null, patchResult: null });
        } catch (err) {
            console.error(err);
            return;
        }
    }

    async function focusDifference(index: number) {
        if (uniqueDiff.length < index) return;
        let diff = uniqueDiff[index];
        if (!diff) return;
        console.log("focusing difference", diff);
        if (diff.pathLeft) {
            if (!leftRefEditor.current) return;
            try {
                let _path = parseJSONPath(diff.pathLeft);
                leftRefEditor.current.focus().then(() => {
                    leftRefEditor.current.expand((path) => {
                        if (!path) return true;
                        let joined = path.join('.');
                        let joined_ours = _path.join('.').substring(2);
                        let equal = joined_ours.startsWith(joined);
                        return equal;
                    });
                    _path.shift();
                    // console.log('scrolling', _path);
                    leftRefEditor.current.scrollTo(_path).then(() => {
                        // _path_left.shift();
                        if (leftRefEditor.current) leftRefEditor.current.findElement(_path).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3 })
                    });
                }).catch(console.error);
            } catch (err) {
                console.error(err);
            }
        }
        if (diff.pathRight) {
            // console.log('focusing right', rightRefEditor.current);
            if (!rightRefEditor.current) return;
            try {
                let _path = parseJSONPath(diff.pathRight);
                rightRefEditor.current.focus().then(() => {
                    // console.log('right focused');
                    rightRefEditor.current.expand((path) => {
                        if (!path) return true;
                        let joined = path.join('.');
                        let joined_ours = _path.join('.').substring(2);
                        let equal = joined_ours.startsWith(joined);
                        return equal;
                    });
                    _path.shift();
                    // console.log('scrolling to', _path);
                    rightRefEditor.current.scrollTo(_path).then(() => {
                        // console.log('found element', _path);
                        if (rightRefEditor.current) rightRefEditor.current.findElement(_path).animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3 })
                    }).catch(console.error);
                }).catch(console.error);
            } catch (err) {
                console.error(err);
            }
        }
    }

    function changeLeftMode(mode: Mode) {
        setLeftMode(mode);
    }
    function changeRightMode(mode: Mode) {
        setRightMode(mode);
    }

    function focusOnPreviousDifference() {
        if (currentDifferenceIndex < 1) return;
        focusDifference(currentDifferenceIndex - 2).then(console.log).catch(console.error);
        if (currentDifferenceIndex <= 1) return;
        setCurrentDifferenceIndex(currentDifferenceIndex - 1);
    }

    function focusOnNextDifference() {
        if (currentDifferenceIndex > uniqueDiff.length) return;
        focusDifference(currentDifferenceIndex).then(console.log).catch(console.error);
        if (currentDifferenceIndex >= uniqueDiff.length) return;
        setCurrentDifferenceIndex(currentDifferenceIndex + 1);
    }

    return (
        <Container css={{ padding: 0 }} xl>
            {loading ? (
                <Loading />
            ) : (
                <>
                    <div className={styles.grid}>
                        <div id={leftId} className={styles.col}>
                            <JSONPane
                                sortData={sortLeft}
                                mode={leftMode}
                                jsonRefEditor={leftRefEditor}
                                onChangeMode={changeLeftMode}
                                childProps={{
                                    mode: leftMode,
                                    onChange: onLeftChange,
                                }}
                                bindingsTitle={bindingsLeftTitle}
                            ></JSONPane>
                        </div>
                        <div className={styles.mid}>
                            <Text>
                                {currentDifferenceIndex} / {uniqueDiff.length} Differences
                            </Text>
                            <Button.Group disabled={uniqueDiff.length === 0} alt="Difference Navigation" label="Difference Navigation" size="xs">
                                <Button onClick={focusOnNextDifference} disabled={uniqueDiff.length === 0} alt="Next Difference" label="Next Difference" flat>
                                    <BiSolidDownArrow />
                                </Button>
                                <Button onClick={focusOnPreviousDifference} disabled={uniqueDiff.length === 0} alt="Previous Difference" label="Previous Difference" flat>
                                    <BiSolidUpArrow />
                                </Button>
                            </Button.Group>
                        </div>
                        <div id={rightId} className={styles.col}>
                            <JSONPane
                                sortData={sortRight}
                                mode={rightMode}
                                jsonRefEditor={rightRefEditor}
                                bindingsTitle={bindingsRightTitle}
                                onChangeMode={changeRightMode}
                                childProps={{
                                    mode: rightMode,
                                    onChange: onRightChange,
                                }}
                            ></JSONPane>
                        </div>
                    </div>
                    {loadingState && <Loading css={{ position: "absolute", width: "100vw", height: "100vh" }} />}
                </>
            )}
        </Container>
    );
}
