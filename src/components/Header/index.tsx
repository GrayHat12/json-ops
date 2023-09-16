import { Navbar, Switch, Text } from "@nextui-org/react";
import AppLogo from "../../assets/vite.svg";
import Layout from "../Layout";
import useDarkMode from "use-dark-mode";
import { Link } from "react-router-dom";
import { PropsWithChildren } from "react";
import { PiMoon, PiSunBold } from "react-icons/pi";

interface HeaderProps extends PropsWithChildren { };

export default function Header(props: HeaderProps) {
    const darkMode = useDarkMode();
    return (
        <Layout content={props.children}>
            <Navbar isCompact isBordered variant="static">
                <Navbar.Brand as={Link} to="/" href="/">
                    <img src={AppLogo} alt="Vite Logo" width="32" height="32" />
                    <Text b color="inherit" hideIn="xs">
                        JSON Compare
                    </Text>
                </Navbar.Brand>
                <Navbar.Content>
                    <Switch
                        iconOn={<PiMoon />}
                        iconOff={<PiSunBold />}
                        size="md"
                        checked={darkMode.value}
                        onChange={darkMode.toggle}
                    />
                </Navbar.Content>
            </Navbar>
        </Layout>
    );
}
