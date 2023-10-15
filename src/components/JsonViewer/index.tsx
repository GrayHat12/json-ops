import { Modal, Text, useTheme } from "@nextui-org/react";
import { Fragment, useEffect, useState } from "react";
import JsonView from "@uiw/react-json-view";
import { lightTheme } from '@uiw/react-json-view/light';
import { darkTheme } from '@uiw/react-json-view/dark';

export interface Props {
    data?: { json: any, title: string };
    onClose: () => void;
};

export default function JsonViewer(props: Props) {

    const [visible, setVisible] = useState(false);
    const { isDark } = useTheme();

    useEffect(() => {
        setVisible(typeof props.data !== "undefined" && typeof props.data.json !== "undefined")
    }, [props.data]);

    function onClose() {
        setVisible(false);
        props.onClose();
    }

    return (
        <Fragment>
            <Modal fullScreen animated closeButton blur onClose={onClose} open={visible}>
                <Modal.Header>
                    <Text h4>Json Viewer {props.data && props.data.title ? `: ${props.data.title}` : ''}</Text>
                </Modal.Header>
                <Modal.Body>
                    {props.data && props.data.json && <JsonView highlightUpdates={false} collapsed={1} displayDataTypes={false} style={isDark ? darkTheme : lightTheme} value={props.data?.json} />}
                </Modal.Body>
                <Modal.Footer />
            </Modal>
        </Fragment>
    );
}