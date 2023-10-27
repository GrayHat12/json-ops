import { Button, Card, Container, Text } from "@nextui-org/react";
import { ComparisonMetaData } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { RiDeleteBinLine } from "react-icons/ri";
import { db as database } from "../../context/db";
import styles from "./card.module.css";

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

    function deleteComparison() {
        if (!props.metadata) return;
        database.comparisons.delete(props.metadata.id).then(console.log).catch(console.error);
    }

    return (
        <Container>
            <Card className={styles.hidden_button} onClick={onClick} isPressable css={{ w: "inherit", h: "inherit", $$cardColor: props.metadata ? '$colors$primary' : '$colors$secondary', position: "relative" }}>
                <Card.Body>
                    <Container css={{ display: "flex", w: "$50", h: "$50", maxH: "$100", maxW: "$100", wordWrap: "break-word" }}>
                        <Text color="white" h4>{props.metadata?.title || "New Comparison"}</Text>
                        {props.metadata && <Button
                            onClick={deleteComparison}
                            bordered={false}
                            className={styles.hover_button}
                            size="md"
                            icon={<RiDeleteBinLine size={22} fill="#73110f" />}
                        />}
                    </Container>
                </Card.Body>
            </Card>
        </Container>
    );
}