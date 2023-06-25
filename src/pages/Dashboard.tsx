import { Button, Card, Col, Container, Row, Text } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();

    function onPress() {
        navigate("compare/new");
    }
    return (
        <Container css={{ display: "flex", alignItems: "center", height: "85vh", justifyContent: "center" }}>
            <Card onPress={onPress} isPressable css={{ w: "80%", h: "400px", maxW: "500px" }}>
                <Card.Header css={{ position: "absolute", zIndex: 1, top: 5 }}>
                    <Col>
                        <Text size={12} weight="bold" transform="uppercase" color="#9E9E9E">
                            Json Compare
                        </Text>
                        <Text h3 color="white">
                            Start a new comparison
                        </Text>
                    </Col>
                </Card.Header>
                <Card.Body css={{ p: 0 }}>
                    <Card.Image
                        src="/add.jpg"
                        objectFit="cover"
                        width="100%"
                        height="100%"
                        alt="Relaxing app background"
                    />
                </Card.Body>
                <Card.Footer
                    isBlurred
                    css={{
                        position: "absolute",
                        bgBlur: "#0f111466",
                        borderTop: "$borderWeights$light solid $gray800",
                        bottom: 0,
                        zIndex: 1,
                    }}
                >
                    <Row>
                        <Col>
                            <Row>
                                <Col span={3}>
                                    <Card.Image
                                        src="/vite.svg"
                                        css={{ bg: "black", br: "50%" }}
                                        height={40}
                                        width={40}
                                        alt="App Icon"
                                    />
                                </Col>
                                <Col>
                                    <Text color="#d1d1d1" size={12}>
                                        JSON compare
                                    </Text>
                                    <Text color="#d1d1d1" size={12}>
                                        Application.
                                    </Text>
                                </Col>
                            </Row>
                        </Col>
                        <Col>
                            <Row justify="flex-end">
                                <Button flat auto rounded css={{ color: "#94f9f0", bg: "#94f9f026" }}>
                                    <Text css={{ color: "inherit" }} size={12} weight="bold" transform="uppercase">
                                        Install App
                                    </Text>
                                </Button>
                            </Row>
                        </Col>
                    </Row>
                </Card.Footer>
            </Card>
        </Container>
    );
}
