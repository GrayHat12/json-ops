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

let interval: number | undefined = undefined;
let differenceInterval: number | undefined = undefined;

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

const STYLE_ID = "jsoneditor-styles-custom";

export default function Compare() {
    const [title, setTitle] = useState<string>("");
    const [assignedId, setAssignedId] = useState<number>();
    const [uniqueDiff, setUniqueDiff] = useState<{ pathLeft?: string; pathRight?: string}[]>([]);
    const [differenceObject, setDifference] = useState<Difference | null>(null);
    const [leftMode, setLeftMode] = useState<Mode>(Mode.tree);
    const [rightMode, setRightMode] = useState<Mode>(Mode.tree);
    const [currentDifferenceIndex, setCurrentDifferenceIndex] = useState<number>(0);

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
        if (differenceInterval) {
            clearInterval(differenceInterval);
            differenceInterval = undefined;
        }
        if (leftjson && rightjson) {
            console.log("Finding difference");
            differenceInterval = setInterval(() => {
                difference(leftjson, rightjson).then(_diff => {
                    setDifference(_diff);
                    if (differenceInterval) clearInterval(differenceInterval);
                    console.log("Difference found");
                }).catch(err => {
                    console.error(err);
                    console.log("Error finding difference");
                    setDifference(null);
                });
            }, 500);
        } else {
            setDifference(null);
        }
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

    async function highlightPath(path: JSONPath, editorid: string, className: string, styleRules: string[]) {
        while (path.length > 0) {
            let datapath = `%2F${path.join("%2F")}`;
            styleRules.push(`
                #${editorid} div[data-path="${datapath}"] {
                    --background-color-custom: ${className == styles.different ? "#F6D283" : className == styles.extra ? "#C5DA8B" : "#ED8373"};
                }
                #${editorid} div[data-path="${datapath}"]>div:first-child>div {
                    color: #292D1C !important;
                    --jse-key-color: #292D1C !important;
                    background-color: var(--background-color-custom) !important;
                }
                #${editorid} div[data-path="${datapath}"]:first-child {
                    color: #292D1C !important;
                    --jse-selection-background-inactive-color: var(--background-color-custom) !important;
                }
                `);
            path.pop();
        }
    }

    async function highlightDifference(sideDiff: JSONDiff, editor: string, returnable: JSONEditor) {
        let tasks: Promise<void>[] = [];
        let styleRules: string[] = [];
        for(let i = 0; i < sideDiff.different.length; i++) {
            let path = sideDiff.different[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path, editor, styles.different, styleRules));
        }
        for(let i = 0; i < sideDiff.extra.length; i++) {
            let path = sideDiff.extra[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path, editor, styles.extra, styleRules));
        }
        for(let i = 0; i < sideDiff.missing.length; i++) {
            let path = sideDiff.missing[i];
            let _path = parseJSONPath(path.substring(2));
            tasks.push(highlightPath(_path, editor, styles.missing, styleRules));
        }
        await Promise.all(tasks);
        let styleElement = getStylesElement(STYLE_ID);
        styleElement.innerHTML = styleElement.innerHTML + "\n" + styleRules.join("\n");
        returnable.refresh();
        return returnable;
    }

    useEffect(() => {
        if (interval) clearInterval(interval);
        interval = setInterval(regularHighlightJob, 10);
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [differenceObject]);

    useEffect(() => {
        if (!differenceObject) {
            setUniqueDiff([]);
            return;
        }
        let left = differenceObject.left;
        let right = differenceObject.right;
        let uniques: { pathLeft?: string; pathRight?: string;}[] = [];
        left.different.filter((x, index) => !left.different.find((y,_index) => y.startsWith(x) && index != _index)).forEach((path) => {
            if (right.different.includes(path)) {
                uniques.push({ pathLeft: path, pathRight: path});
            }
        });
        left.extra.forEach((path) => {
            if (!right.extra.includes(path)) {
                uniques.push({ pathLeft: path});
            }
        });
        right.extra.forEach((path) => {
            if (!left.extra.includes(path)) {
                uniques.push({ pathRight: path});
            }
        });
        setUniqueDiff(uniques);
        setCurrentDifferenceIndex(uniques.length === 0 ? 0 : 1);
    }, [differenceObject]);

    async function regularHighlightJob() {
        console.log("Running regular highlight job");
        clearPreviousDifference();
        if (!differenceObject) {
            console.log("cleared interval");
            clearInterval(interval);
            interval = undefined;
            return;
        }
        let tasks: Promise<JSONEditor>[] = [];
        if (differenceObject.left && leftRefEditor.current) {
            console.log("highlighting difference left");
            tasks.push(highlightDifference(differenceObject.left, leftId, leftRefEditor.current));
        }
        if (differenceObject.right && rightRefEditor.current) {
            console.log("highlighting difference right");
            tasks.push(highlightDifference(differenceObject.right, rightId, rightRefEditor.current));
        }
        console.log("cleared regularHighlight interval");
        clearInterval(interval);
        interval = undefined;
        return Promise.all(tasks);
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

    function focusDifference(index: number) {
        if (uniqueDiff.length < index) return;
        let diff = uniqueDiff[index];
        if (!diff) return;
        if (diff.pathLeft) {
            if (!leftRefEditor.current) return;
            try {
                let _path = parseJSONPath(diff.pathLeft);
                leftRefEditor.current.expand((path) => {
                    if (!path) return true;
                    let joined = path.join('.');
                    let joined_ours = _path.join('.').substring(2);
                    let equal = joined_ours.startsWith(joined);
                    return equal;
                });
                leftRefEditor.current.scrollTo(_path).then(() => {
                    _path.shift();
                    if (leftRefEditor.current) leftRefEditor.current.findElement(_path).animate([{opacity: 0}, {opacity: 1}], {duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3})
                });
            } catch (err) {
                console.error(err);
            }
        }
        if (diff.pathRight) {
            if (!rightRefEditor.current) return;
            try {
                let _path = parseJSONPath(diff.pathRight);
                rightRefEditor.current.expand((path) => {
                    if (!path) return true;
                    let joined = path.join('.');
                    let joined_ours = _path.join('.').substring(2);
                    let equal = joined_ours.startsWith(joined);
                    return equal;
                });
                rightRefEditor.current.scrollTo(_path).then(() => {
                    _path.shift();
                    if (rightRefEditor.current) rightRefEditor.current.findElement(_path).animate([{opacity: 0}, {opacity: 1}], {duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3})
                });
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
        focusDifference(currentDifferenceIndex - 2);
        if (currentDifferenceIndex <= 1) return;
        setCurrentDifferenceIndex(currentDifferenceIndex - 1);
    }

    function focusOnNextDifference() {
        if (currentDifferenceIndex > uniqueDiff.length) return;
        focusDifference(currentDifferenceIndex);
        if (currentDifferenceIndex >= uniqueDiff.length) return;
        setCurrentDifferenceIndex(currentDifferenceIndex + 1);
    }

    return (
        <Container css={{ padding: 0 }} xl>
            {loading ? (
                <Loading />
            ) : (
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
            )}
        </Container>
    );
}
