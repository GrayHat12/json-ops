import React, { ErrorInfo } from "react";

export type FallbackType = React.FunctionComponent<{ error?: Error, errorInfo?: ErrorInfo, resetError: () => void }>;

export interface Props extends React.PropsWithChildren {
    FallbackComponent: FallbackType;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

export interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends React.Component<Props, State, never> {

    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };

        this.resetError = this.resetError.bind(this);
        this.onUnhandledRejection = this.onUnhandledRejection.bind(this);
    }

    static getDerivedStateFromError(error: Error) {
        console.log('here');
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.log('here2');
        this.setState({ error, hasError: true, errorInfo: info });
        this.props.onError?.(error, info);
    }

    onUnhandledRejection(event: PromiseRejectionEvent) {
        console.log('here3', event);
        this.setState({
            hasError: true,
            error: Error(`${event.promise} failed for ${event.reason}`)
        });
    }

    componentDidMount() {
        if (!window) return;
        window.addEventListener("unhandledrejection", this.onUnhandledRejection);
    }

    componentWillUnmount() {
        if (!window) return;
        window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
    }

    resetError() {
        this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined
        });
    }

    render() {
        const { FallbackComponent } = this.props;
        console.log(this.state);
        if (this.state.hasError) {
            return (
                <FallbackComponent resetError={this.resetError} error={this.state.error} errorInfo={this.state.errorInfo} />
            );
        }
        return this.props.children;
    }

}