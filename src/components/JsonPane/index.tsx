import { Button, Container, Input } from "@nextui-org/react";
import { MutableRefObject } from "react";
import { GiStarFormation } from "react-icons/gi";
import { BindingsChangeTarget } from "@nextui-org/react/types/use-input/use-input";
import JSONEditorReact from "../JSONEditorReact";
import { JSONEditor, Mode, JSONEditorPropsOptional } from "vanilla-jsoneditor";

interface JSONPaneProps {
    bindingsTitle: {
        value: string;
        onChange: (event: BindingsChangeTarget) => void;
    };
    jsonRefEditor: MutableRefObject<JSONEditor | undefined>;
    sortData?: () => void;
    onChangeMode: (mode: Mode) => void;
    mode: Mode;
    childProps: JSONEditorPropsOptional;
}

export default function JSONPane(props: JSONPaneProps) {

    const myAvlHeight = 1152;
    const usableHeight = 1152 - 993;
    const usablePercentage = usableHeight / myAvlHeight;
    const currentAvlHeight = window.screen.availHeight * usablePercentage;
    const possibleRows = Math.floor((43 / usableHeight) * currentAvlHeight);

    return (
        <Container
            css={{
                width: "100%",
                padding: 0,
                maxW: "100%",
            }}
        >
            <Container alignItems="flex-start" css={{ padding: 0 }}>
                <Container
                    display="flex"
                    css={{
                        padding: 0,
                        alignItems: "baseline",
                        justifyContent: "space-between",
                    }}
                >
                    <Button.Group size="xs">
                        <Button onClick={() => props.mode !== Mode.text && props.onChangeMode(Mode.text)} bordered={props.mode !== Mode.text}>
                            Text
                        </Button>
                        <Button onClick={() => props.mode !== Mode.tree && props.onChangeMode(Mode.tree)} bordered={props.mode !== Mode.tree}>
                            Tree
                        </Button>
                    </Button.Group>
                    <Input css={{flex: 1}} size="sm" placeholder="Json Title" {...props.bindingsTitle} />
                    <Button.Group size="xs">
                        <Button
                            onClick={props.sortData}
                            disabled={!props.sortData}
                            flat
                            icon={<GiStarFormation fill="currentColor" />}
                        >
                            Sort
                        </Button>
                    </Button.Group>
                </Container>
            </Container>
            <JSONEditorReact
                style={{
                    width: "100%",
                    height: possibleRows * 21,
                }}
                mainMenuBar={false}
                statusBar={false}
                refEditor={props.jsonRefEditor}
                {...props.childProps}
            />
        </Container>
    );
}

// {mode === "text" && (
//     <Textarea
//         minRows={possibleRows}
//         maxRows={possibleRows}
//         width="100%"
//         css={{ maxHeight: (possibleRows + 2) * 21 }}
//         placeholder="Input JSON"
//         {...props.bindingsData}
//     />
// )}
// {mode === "tree" && validJSON && (
//     <div style={{ width: "100%", height: "100%", maxHeight: "100%", maxWidth: "100%" }}>
//         <ReactJson
//             src={validJSON}
//             theme="monokai"
//             displayDataTypes={false}
//             iconStyle="triangle"
//             collapseStringsAfterLength={15}
//             name={null}
//             indentWidth={2}
//             style={{
//                 overflow: "auto",
//                 padding: "var(--nextui-space-6)",
//                 borderRadius: "var(--nextui-space-6)",
//                 maxHeight: (possibleRows + 2) * 21,
//                 minHeight: possibleRows * 21,
//             }}
//         />
//     </div>
// )}
