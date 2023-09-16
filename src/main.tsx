import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { NextUIProvider, createTheme } from "@nextui-org/react";
import useDarkMode from "use-dark-mode";

import "./index.css";

function Main() {
    const lightTheme = createTheme({
        type: "light",
    });

    const darkTheme = createTheme({
        type: "dark",
    });

    const darkMode = useDarkMode(true);

    return (
        <NextUIProvider theme={darkMode.value ? darkTheme : lightTheme}>
            <App />
        </NextUIProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <Main />
    </React.StrictMode>
);
