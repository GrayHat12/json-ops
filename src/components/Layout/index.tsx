import { PropsWithChildren, ReactNode } from "react";

import { styled } from "@nextui-org/react";

export const Box = styled("div", {
    boxSizing: "border-box",
});

interface LayoutProps extends PropsWithChildren {
    content?: ReactNode;
}

export default function Layout(props: LayoutProps) {
    return (
        <Box
            css={{
                maxW: "100%",
            }}
        >
            {props.children}
            {props.content}
        </Box>
    );
}
