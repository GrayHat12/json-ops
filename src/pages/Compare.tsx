import { Button, Container, Text, useInput } from "@nextui-org/react";
import JSONPane from "../components/JsonPane";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { _IDBStorageItem } from "../context/AppContext";
import { JSONEditor, Content, Mode, OnChangeStatus, JSONPath } from "vanilla-jsoneditor";
import Loading from "./Loading";
import { BiSolidUpArrow, BiSolidDownArrow } from "react-icons/bi";
import { sortObj, cleanJSON } from "jsonabc";
import * as jsonabc from "jsonabc";
import styles from "./compare.module.css";
import { JSONDiff, Difference, differenceV2 } from "../utils";
import { parseJSONPath } from "../utils/butils";
import * as utils from "../utils";
import { useWorker, WORKER_STATUS } from "../worker";
import { db as database } from "../context/db";
import JsonViewer from "../components/JsonViewer";

let differencerInterval: ReturnType<typeof setTimeout> | undefined = undefined;
let uniqueDifferenceInterval: ReturnType<typeof setTimeout> | undefined = undefined;


function uniqueDifferenceFunctionV2(differenceObject: Difference) {
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
    left.different.forEach((path) => {
        uniques.push({ pathLeft: path, pathRight: path });
    });
    // tasks = [...tasks, ...left.extra.map(async (path) => {
    //     if (!right.extra.includes(path)) {
    //         uniques.push({ pathLeft: path });
    //     }
    // })];
    left.missing.forEach((path) => {
        uniques.push({ pathLeft: path });
    });
    // tasks = [...tasks, ...right.extra.map(async (path) => {
    //     if (!left.extra.includes(path)) {
    //         uniques.push({ pathRight: path });
    //     }
    // })];
    right.extra.filter((x, index) => !right.extra.find((y, _index) => y.startsWith(x) && index != _index)).forEach((path) => {
        uniques.push({ pathRight: path });
    });
    // await Promise.all(tasks);
    // if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
    // uniqueDifferenceInterval = undefined;
    // setUniqueDiff(uniques);
    // setCurrentDifferenceIndex(uniques.length === 0 ? 0 : 1);
    return { uniques, index: uniques.length === 0 ? 0 : 1 };
}

function customSort(input: any) {
    let data = JSON.parse(cleanJSON(JSON.stringify(input)));
    return sortObj(data);
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
    const [uniqueDifferenceWorker, { status: differenceWorkerStatus, kill: killDifferenceWorker }] = useWorker(uniqueDifferenceFunctionV2);
    const [differenceFinderWorker, { status: differenceFinderWorkerStatus, kill: killDifferenceFinderWorker }] = useWorker(differenceV2, {
        localDependencies() {
            return { ...utils, cache: {} }
        },
    });
    const [leftSortWorker, { status: leftSortWorkerStatus, kill: killLeftSortWorker }] = useWorker(customSort, {
        localDependencies() {
            return {...jsonabc, isArray: utils.isArray, isObject: utils.isPlainObject }
        },
    });
    const [rightSortWorker, { status: rightSortWorkerStatus, kill: killRightSortWorker }] = useWorker(customSort, {
        localDependencies() {
            return {...jsonabc, isArray: utils.isArray, isObject: utils.isPlainObject }
        },
    });
    const [currentlyViewing, setCurrentlyViewing] = useState<{json: any, title: string} | undefined>(undefined);

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

    // const { loading } = useAppContext();
    const [functionsToRunAfterRender, setFunctionsToRunAfterRender] = useState<
        ((left: JSONEditor, right: JSONEditor) => void)[]
    >([]);

    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        // (window as any).test = parseJSONPath;
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

        database.comparisons.get(id_as_number).then((comparison) => {
            setTitle(comparison.data.title);
            setAssignedId(comparison.id || id_as_number);
            setFunctionsToRunAfterRender((prev) => [
                ...prev,
                (left, right) => {
                    left.set({ 'json': comparison.data.data.json_left.data }),
                        right.set({ 'json': comparison.data.data.json_right.data }),
                        onChange();
                }
            ]);
            setLeftTitle(comparison.data.data.json_left.title);
            setRightTitle(comparison.data.data.json_right.title);
        }).catch((err) => {
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

    function uniqueDifferenceFunctionRunner() {
        console.log('Running unique difference function runner', differenceWorkerStatus);
        if (differenceWorkerStatus === WORKER_STATUS.RUNNING) {
            console.log('Killing previous difference worker');

        }
        killDifferenceWorker();
        console.log('Starting unique difference worker');
        uniqueDifferenceWorker(differenceObject).then(result => {
            console.log('uniques', result);
            setUniqueDiff(result.uniques);
            setCurrentDifferenceIndex(result.index);
        }).catch(console.error).finally(() => {
            console.log("FINISHED");
        });
        if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
    }

    useEffect(() => {
        if (!differenceObject) {
            setUniqueDiff([]);
            return;
        }
        if (uniqueDifferenceInterval) {
            clearInterval(uniqueDifferenceInterval);
        }
        uniqueDifferenceInterval = setInterval(uniqueDifferenceFunctionRunner, 100);
        return () => {
            if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
        };
    }, [differenceObject]);

    useEffect(() => {
        killDifferenceWorker();
        killDifferenceFinderWorker();
    }, [killDifferenceFinderWorker, killDifferenceWorker]);

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
        console.log('Running left sort function runner', leftSortWorkerStatus);
        if (leftSortWorkerStatus === WORKER_STATUS.RUNNING) {
            console.log('Killing previous left sort worker');
        }
        killLeftSortWorker();
        console.log('Starting left sort worker');
        leftSortWorker(json).then(sorted => {
            if (leftMode == Mode.text) {
                leftRefEditor.current.set({ text: JSON.stringify(sorted) });
            } else if (leftMode == Mode.tree) {
                leftRefEditor.current.set({ json: sorted });
            }
            onLeftChange({ json: sorted }, { json: json }, { contentErrors: null, patchResult: null });
        }).catch(console.error).finally(() => {
            console.log("FINISHED");
        });
        // if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
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
        console.log('Running right sort function runner', rightSortWorkerStatus);
        if (rightSortWorkerStatus === WORKER_STATUS.RUNNING) {
            console.log('Killing previous right sort worker');
        }
        killRightSortWorker();
        console.log('Starting right sort worker');
        rightSortWorker(json).then(sorted => {
            if (rightMode == Mode.text) {
                rightRefEditor.current.set({ text: JSON.stringify(sorted) });
            } else if (rightMode == Mode.tree) {
                rightRefEditor.current.set({ json: sorted });
            }
            onRightChange({ json: sorted }, { json: json }, { contentErrors: null, patchResult: null });
        }).catch(console.error).finally(() => {
            console.log("FINISHED");
        });
        // if (uniqueDifferenceInterval) clearInterval(uniqueDifferenceInterval);
    }

    async function focusDifference(index: number) {
        if (uniqueDiff.length < index) return;
        let diff = uniqueDiff[index];
        if (!diff) return;
        console.log("focusing difference", diff);
        if (diff.pathLeft) {
            if (!leftRefEditor.current) return;
            if (leftMode != Mode.tree) return;
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
                        if (leftRefEditor.current) leftRefEditor.current.findElement(_path)?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3 })
                    });
                }).catch(console.error);
            } catch (err) {
                console.error(err);
            }
        }
        if (diff.pathRight) {
            // console.log('focusing right', rightRefEditor.current);
            if (!rightRefEditor.current) return;
            if (rightMode != Mode.tree) return;
            try {
                let _path = parseJSONPath(diff.pathRight);
                // console.log('_path', _path);
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
                        if (rightRefEditor.current) rightRefEditor.current.findElement(_path)?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards', iterations: 3 })
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
        let newIndex = currentDifferenceIndex - 2;
        if (newIndex < 0) {
            newIndex = uniqueDiff.length - 1;
        }
        focusDifference(newIndex).then(console.log).catch(console.error);
        if (currentDifferenceIndex <= 1) return;
        setCurrentDifferenceIndex(newIndex + 1);
    }

    function focusOnNextDifference() {
        // console.log(currentDifferenceIndex, uniqueDiff.length);
        if (currentDifferenceIndex > uniqueDiff.length) return;
        let newIndex = currentDifferenceIndex;
        if (newIndex > (uniqueDiff.length - 1)) {
            newIndex = 0;
        }
        focusDifference(newIndex).then(console.log).catch(console.error);
        if (currentDifferenceIndex >= uniqueDiff.length) return;
        setCurrentDifferenceIndex(newIndex + 1);
    }

    function onSave() {
        if (leftTitle.length < 3) {
            alert("Left title is too short");
            return;
        }
        if (rightTitle.length < 3) {
            alert("Right title is too short");
            return;
        }
        if (leftTitle.length > 30) {
            alert("Left title is too long");
            return;
        }
        if (rightTitle.length > 30) {
            alert("Right title is too long");
            return;
        }
        // left json
        let leftJson: any = null;
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
            leftJson = JSON.parse(cleanJSON(JSON.stringify(json)));
        } catch (err) {
            console.error(err);
            return;
        }

        // right json
        let rightJson: any = null;
        if (!rightRefEditor.current) return;
        content = rightRefEditor.current.get();
        json = (content as any).json;
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
            rightJson = JSON.parse(cleanJSON(JSON.stringify(json)));
        } catch (err) {
            console.error(err);
            return;
        }

        if (!leftJson || !rightJson) return;
        let data_to_save = {
            title: `${leftTitle} vs ${rightTitle}`,
            data: {
                json_left: {
                    title: leftTitle,
                    data: leftJson,
                },
                json_right: {
                    title: rightTitle,
                    data: rightJson,
                }
            }
        };
        if (assignedId) {
            database.comparisons.update(assignedId, { data: data_to_save }).then(v => {
                // console.log('v1', v);
                // navigate(`/compare/${v}`);
            }).catch(console.error);
        } else {
            database.comparisons.put({ data: data_to_save }).then(v => {
                console.log('v', v);
                navigate(`/compare/${v}`);
            }).catch(console.error);
        }
    }

    function onCloseViewer() {
        setCurrentlyViewing(undefined);
    }

    function setViewingLeft() {
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
            setCurrentlyViewing({json: data, title: leftTitle});
        } catch (err) {
            console.error(err);
            return;
        }
    }

    function setViewingRight() {
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
            setCurrentlyViewing({json: data, title: rightTitle});
        } catch (err) {
            console.error(err);
            return;
        }
    }

    return (
        <Container css={{ padding: 0, position: "relative" }} xl>
            {false ? (
                <Loading />
            ) : (
                <>
                    <JsonViewer onClose={onCloseViewer} data={currentlyViewing} />
                    <div className={styles.grid}>
                        <div id={leftId} className={styles.col}>
                            <JSONPane
                                sortData={sortLeft}
                                mode={leftMode}
                                view={setViewingLeft}
                                jsonRefEditor={leftRefEditor}
                                onChangeMode={changeLeftMode}
                                childProps={{
                                    mode: leftMode,
                                    onChange: onLeftChange,
                                    onClassName: ((path, value) => {
                                        let pathString = `$.${path.map(x => x.match(/^\d+$/) ? `[${x}]` : x).map(x => x.includes('.') ? `"${x}"`: x).join('.')}`;
                                        if (pathString === '$.') return "";
                                        if (differenceObject?.left.different.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.different);
                                            return styles.different;
                                        } else if (differenceObject?.left.missing.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.missing);
                                            return styles.missing;
                                        } else if (differenceObject?.left.extra.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.extra);
                                            return styles.extra;
                                        }
                                    })
                                }}
                                bindingsTitle={bindingsLeftTitle}
                            ></JSONPane>
                        </div>
                        <div className={styles.mid}>
                            <div>
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
                            <div style={{ marginTop: 50 }}>
                                <Button disabled={
                                    false || !(((leftRefEditor.current?.get() as any)?.json || (leftRefEditor.current?.get() as any)?.text) && ((rightRefEditor.current?.get() as any)?.json || (rightRefEditor.current?.get() as any)?.text))
                                } size="xs" onClick={onSave} alt="Save Comparison" label="Save Comparison" variant="bordered">
                                    Save
                                </Button>
                            </div>
                        </div>
                        <div id={rightId} className={styles.col}>
                            <JSONPane
                                sortData={sortRight}
                                mode={rightMode}
                                view={setViewingRight}
                                jsonRefEditor={rightRefEditor}
                                bindingsTitle={bindingsRightTitle}
                                onChangeMode={changeRightMode}
                                childProps={{
                                    mode: rightMode,
                                    onChange: onRightChange,
                                    onClassName: ((path, value) => {
                                        let pathString = `$.${path.map(x => x.match(/^\d+$/) ? `[${x}]` : x).map(x => x.includes('.') ? `"${x}"`: x).join('.')}`;
                                        if (pathString === '$.') return "";
                                        if (differenceObject?.right.different.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.different);
                                            return styles.different;
                                        } else if (differenceObject?.right.missing.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.missing);
                                            return styles.missing;
                                        } else if (differenceObject?.right.extra.find(x => x.startsWith(pathString))) {
                                            // console.log(pathString, differenceObject.left.extra);
                                            return styles.extra;
                                        }
                                    })
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
