import { useTheme } from "@nextui-org/react";
import { CSSProperties, MutableRefObject, useEffect, useRef } from "react";
import { JSONEditor, JSONEditorPropsOptional } from "vanilla-jsoneditor";

export interface JSONEditorProps extends JSONEditorPropsOptional {
    style?: CSSProperties;
    refEditor: MutableRefObject<JSONEditor | undefined>;
}

function getStyleElement(id: string) {
    let element = document.getElementById(id);
    if (element) {
        return element;
    }
    element = document.createElement("style");
    element.id = id;
    return element;
}

function saveStyleElement(element: HTMLElement) {
    let existing = document.getElementById(element.id);
    if (existing) {
        existing.innerHTML = element.innerHTML;
    } else {
        document.head.appendChild(element);
    }
}

export default function JSONEditorReact(props: JSONEditorProps) {
    const refContainer = useRef<HTMLDivElement>(null);
    const styleId = "jsoneditor-styles";
    const className = "my-json-editor";
    const { theme } = useTheme();

    useEffect(() => {
        // create editor
        props.refEditor.current = new JSONEditor({
            target: refContainer.current!,
            props: {},
        });

        return () => {
            // destroy editor
            if (props.refEditor.current) {
                props.refEditor.current.destroy();
                props.refEditor.current = undefined;
            }
        };
    }, []);

    useEffect(() => {
        if (!theme) return;
        // add styles
        // console.log("Updating styles", theme, refEditor.current);
        let styleElement = getStyleElement(styleId);
        styleElement.innerHTML = `
        .my-json-editor {
            --jse-theme-color: ${theme.colors.primary.value} !important;
            --jse-theme-color-highlight: ${theme.colors.backgroundContrast.value} !important;
            --jse-background-color: ${theme.colors.backgroundContrast.value} !important;
            --jse-delimiter-color: ${theme.colors.foreground.value} !important;
            --jse-value-color-string: ${theme.colors.neutral.value} !important;
            --jse-selection-background-color: ${theme.colors.accents5.value} !important;
            --jse-selection-background-inactive-color: ${theme.colors.backgroundContrast.value} !important;
            --jse-value-color-boolean: #0b7fe2 !important;
            --jse-value-color-number: #7FA360 !important;
            --jse-panel-background: ${theme.colors.accents0.value} !important;
            --jse-main-border: 1px solid ${theme.colors.border.value} !important;
            --jse-key-color: ${theme.colors.secondary.value} !important;
            --jse-text-color: ${theme.colors.secondary.value} !important;
        }
        .my-json-editor ul, ol {
            color: #ECEDEE !important;
        }
        .cm-editor {
            --indent-marker-bg-color: ${theme.colors.neutralBorder.value} !important;
            --indent-marker-active-bg-color: ${theme.colors.neutralSolidHover.value} !important;
        }
        `;
        saveStyleElement(styleElement);
        props.refEditor.current?.refresh();
    }, [theme, props.refEditor.current]);

    useEffect(() => {
        // update props
        console.log("Updating props", props);
        let { content, style, refEditor, ...rest } = props;
        if (props.refEditor.current) {
            if (content) {
                props.refEditor.current.updateProps({
                    content: props.content,
                    ...rest,
                });
            } else {
                props.refEditor.current.updateProps({
                    ...rest,
                });
            }
        }
    }, [props, props.refEditor.current]);

    return <div className={className} style={props.style} ref={refContainer} />;
}
