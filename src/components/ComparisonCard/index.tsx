import { Card, Container, Text } from "@nextui-org/react";
import { ComparisonMetaData } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";

export interface ComparsionCardProps {
    metadata?: ComparisonMetaData;
};

export default function ComparisonCard(props: ComparsionCardProps) {
    const navigate = useNavigate();

    function onClick() {
        if (props.metadata) {
            navigate(`compare/${props.metadata.id}`)
        }
        else {
            navigate("compare/new");
        }
    }

    return (
        <Container>
            <Card onClick={onClick} isPressable css={{ w: "inherit", h: "inherit", $$cardColor: props.metadata ? '$colors$primary' : '$colors$secondary' }}>
                <Card.Body>
                    <Container css={{ display: "flex", w: "$50", h: "$50", maxH: "$100", maxW: "$100", wordWrap: "break-word" }}>
                        <Text color="white" h4>{props.metadata?.title || "New Comparison"}</Text>
                    </Container>
                </Card.Body>
            </Card>
        </Container>
    );
}