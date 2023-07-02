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
    const [uniqueDiff, setUniqueDiff] = useState<{ pathLeft?: string; pathRight?: string; pointer: boolean }[]>([]);
    const [differenceObject, setDifference] = useState<Difference | null>(null);
    const [leftMode, setLeftMode] = useState<Mode>(Mode.tree);
    const [rightMode, setRightMode] = useState<Mode>(Mode.tree);

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
            } catch (err) {}
        }
        if (!rightjson) {
            try {
                rightjson = JSON.parse(right.text);
            } catch (err) {}
        }
        if (differenceInterval) {
            clearInterval(differenceInterval);
            differenceInterval = undefined;
        }
        if (leftjson && rightjson) {
            console.log("Finding difference");
            differenceInterval = setInterval(() => {
                setDifference(difference(leftjson, rightjson));
                clearInterval(differenceInterval);
                console.log("Difference found");
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

    function highlightPath(path: JSONPath, editorid: string, className: string) {
        let first = true;
        let styleRules: string[] = [];
        let styleElement = getStylesElement(STYLE_ID);
        // let uniqueDataPaths: string[] = [];
        // path.forEach((pathItem) => {});
        while (path.length > 0) {
            let datapath = `%2F${path.join("%2F")}`;
            // if (!uniqueDataPaths.includes(datapath)) {
            //     uniqueDataPaths.push(datapath);
            // } else {
                // path.pop();
                // first = false;
                // continue;
            // }
            // if (first) {
                styleRules.push(`
                #${editorid} div[data-path="${datapath}"] {
                    --background-color-custom: ${
                        className == styles.different ? "#F6D283" : className == styles.extra ? "#C5DA8B" : "#ED8373"
                    };
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
            // } else {
                // styleRules.push(`
                // #${editorid} div[data-path="${datapath}"] {
                //     --background-color-custom: #F6D283;
                // }
                // #${editorid} div[data-path="${datapath}"]>div:first-child>div:first-child {
                //     background-color: var(--background-color-custom) !important;
                //     --jse-key-color: #292D1C;
                //     --jse-delimiter-color: #292D1C;
                //     // color: #292D1C !important;
                // }
                // #${editorid} div[data-path="${datapath}"] div {
                //     --jse-selection-background-inactive-color: var(--background-color-custom) !important;
                // }
                // `);
            // }
            // element.classList.add(first ? className : parentClassName);
            // first = false;
            path.pop();
        }
        styleElement.innerHTML = styleElement.innerHTML + "\n" + styleRules.join("\n");
        saveStyleElement(styleElement);
    }

    function highlightDifference(sideDiff: JSONDiff, editor: string) {
        sideDiff.different.forEach((path) => {
            // console.log(path);
            let _path = parseJSONPath(path.substring(2));
            highlightPath(_path, editor, styles.different);
        });
        sideDiff.extra.forEach((path) => {
            let _path = parseJSONPath(path.substring(2));
            highlightPath(_path, editor, styles.extra);
        });
        sideDiff.missing.forEach((path) => {
            let _path = parseJSONPath(path.substring(2));
            highlightPath(_path, editor, styles.missing);
        });
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
        let uniques: { pathLeft?: string; pathRight?: string; pointer: boolean }[] = [];
        left.different.forEach((path) => {
            if (right.different.includes(path)) {
                uniques.push({ pathLeft: path, pathRight: path, pointer: false });
            }
        });
        left.extra.forEach((path) => {
            if (!right.extra.includes(path)) {
                uniques.push({ pathLeft: path, pointer: false });
            }
        });
        right.extra.forEach((path) => {
            if (!left.extra.includes(path)) {
                uniques.push({ pathRight: path, pointer: false });
            }
        });
        if (uniques.length > 0) {
            uniques[0].pointer = true;
        }
        setUniqueDiff(uniques);
    }, [differenceObject]);

    function regularHighlightJob() {
        console.log("Running regular highlight job");
        clearPreviousDifference();
        if (!differenceObject) {
            console.log("cleared interval");
            clearInterval(interval);
            interval = undefined;
            return;
        }
        // if (!leftRefEditor.current || !rightRefEditor.current) return;
        if (differenceObject.left && leftRefEditor.current) {
            console.log("highlighting difference left");
            highlightDifference(differenceObject.left, leftId);
            leftRefEditor.current.refresh();
            console.log("highlighted difference left");
        }
        if (differenceObject.right && rightRefEditor.current) {
            console.log("highlighting difference right");
            highlightDifference(differenceObject.right, rightId);
            rightRefEditor.current.refresh();
            console.log("highlighted difference right");
        }
        console.log("cleared interval");
        clearInterval(interval);
        interval = undefined;
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
            leftRefEditor.current.set({ json: sorted });
            onLeftChange({json: sorted}, {json: data}, {contentErrors: null, patchResult: null});
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
            rightRefEditor.current.set({ json: sorted });
            onRightChange({json: sorted}, {json: data}, {contentErrors: null, patchResult: null});
        } catch (err) {
            console.error(err);
            return;
        }
    }

    function changeLeftMode(mode: Mode) {
        setLeftMode(mode);
    }
    function changeRightMode(mode: Mode) {
        setRightMode(mode);
    }

    let currentIndex = 0;
    if (uniqueDiff.length > 0) {
        currentIndex = uniqueDiff.findIndex((x) => x.pointer);
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        currentIndex += 1;
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
                            {currentIndex} / {uniqueDiff.length} Differences
                        </Text>
                        <Button.Group disabled alt="These don't work yet" label="These don't work yet" size="xs">
                            <Button alt="These don't work yet" label="These don't work yet" flat>
                                <BiSolidDownArrow />
                            </Button>
                            <Button alt="These don't work yet" label="These don't work yet" flat>
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
