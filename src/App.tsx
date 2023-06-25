import { lazy, Suspense, LazyExoticComponent } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import Loading from "./pages/Loading";
import { AppProvider } from "./context/AppContext";
import Header from "./components/Header";
import Drawer from "./components/Drawer";
import { Outlet } from "react-router-dom";
import { Grid } from "@nextui-org/react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Compare = lazy(() => import("./pages/Compare"));

function Page({ PAGE }: { PAGE: LazyExoticComponent<any> }) {
    return (
        <Suspense fallback={<Loading />}>
            <PAGE />
        </Suspense>
    );
}

export function RootApp() {
    return (
        <>
            <Header>
                <Grid.Container gap={2} justify="start">
                    <Grid sm={1}>
                        <Drawer />
                    </Grid>
                    <Grid sm>
                        <Outlet />
                    </Grid>
                </Grid.Container>
            </Header>
        </>
    );
}

const router = createHashRouter([
    {
        path: "/",
        element: <RootApp />,
        children: [
            {
                path: "/",
                element: <Page PAGE={Dashboard} />,
            },
            {
                path: "compare/:id",
                element: <Page PAGE={Compare} />,
            },
            {
                path: "loader",
                element: <Loading />,
            },
        ]
    },
    {
        path: "/loading",
        element: <Loading />,
    },
]);

export default function App() {
    return (
        <AppProvider>
            <RouterProvider router={router}></RouterProvider>
        </AppProvider>
    );
}
