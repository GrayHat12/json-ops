import { Button, Code, Snippet, Spacer } from "@nextui-org/react";
import { FallbackType } from "../ErrorBoundary";
import styles from "./styles.module.css";

const ErrorComponent: FallbackType = ({ resetError, error, errorInfo }) => {
    
    function onRestart() {
        window.location.hash = "";
        window.location.pathname = "";
        window.location.reload();
        resetError();
    }

    return (
        <div className={styles.error}>
            <Spacer y={2}/>
            <Snippet copy="slient" variant="shadow" color="danger">{error ? `${error.name} - ${error.message}` : "Some Unexpected Error Occured"}</Snippet>
            <Spacer y={1}/>
            {error && error.stack && <Code color="danger" size="lg">{error.stack}</Code>}
            <Spacer y={1} />
            {errorInfo && <Code color="danger" size="lg">{errorInfo.componentStack}</Code>}
            <Spacer y={1} />
            <Button onClick={onRestart}>Restart</Button>
        </div>
    );
};

export default ErrorComponent;