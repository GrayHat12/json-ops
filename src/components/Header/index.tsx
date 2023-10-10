import { Navbar, Switch, Text } from "@nextui-org/react";
import AppLogo from "../../assets/icon.svg";
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
                <Navbar.Brand aria-label="Link to Homepage" as={Link} to="/" href="/">
                    <img aria-label="App Logo" src={AppLogo} alt="Vite Logo" width="32" height="32" style={{marginRight: 14}} />
                    <Text aria-label="Page Title" color="inherit" hideIn="xs">
                        JSON Compare
                    </Text>
                </Navbar.Brand>
                <Navbar.Content>
                    <Switch
                        iconOn={<PiMoon aria-label="Dark Mode Icon" />}
                        iconOff={<PiSunBold aria-label="Light Mode Icon" />}
                        size="md"
                        aria-label="Dark Mode Switch"
                        checked={darkMode.value}
                        onChange={darkMode.toggle}
                    />
                </Navbar.Content>
            </Navbar>
        </Layout>
    );
}
