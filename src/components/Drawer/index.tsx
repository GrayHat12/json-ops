import { Card, Container, Text } from "@nextui-org/react";
import { ComparisonMetaData } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import { db as database } from "../../context/db";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "./Drawer.module.css";

function generateMockData(items: number) {
    const data = [];
    for (let i = 0; i < items; i++) {
        data.push({
            id: i,
            title: `Test ${i}`,
        });
    }
    return data;
}

export interface ComparisonMetaProps {
    metadata: ComparisonMetaData;
}

export function CompareMetaCard(props: ComparisonMetaProps) {
    console.log('props', props);
    let navigate = useNavigate();
    function navigateToCompare() {
        navigate(`compare/${props.metadata.id}`);
    }

    // return (
    //     <Card
    //         onPress={navigateToCompare}
    //         isPressable
    //         isHoverable
    //         variant="bordered"
    //         css={{ mw: "400px", marginBottom: 20 }}
    //     >
    //         <Card.Body css={{ textAlign: "justify" }}>
    //             <Text>{props.metadata.title}</Text>
    //         </Card.Body>
    //     </Card>
    // );
    return (
        <div className={styles.card}>
            <Text>{props.metadata.title}</Text>
        </div>
    )
}

export default function Drawer() {
    // const { savedComparisons } = useAppContext();
    // console.log('saved comparisons', savedComparisons);
    // const savedComparisonsList = savedComparisons.length ? savedComparisons : generateMockData(10);

    const savedComparisons = useLiveQuery(() => database.comparisons.toArray());
    console.log(savedComparisons);

    const myAvlHeight = 1152;
    const usableHeight = 870;
    const usablePercentage = usableHeight / myAvlHeight;
    const currentAvlHeight = window.screen.availHeight * usablePercentage;

    return (
        <Container
            css={{
                alignItems: "center",
                overflow: "auto",
                textAlign: "center",
                padding: 0,
                justifyContent: "center",
            }}
        >
            <Container css={{ marginBottom: 20, marginTop: 10, padding: 0, textAlign: "center" }}>
                <Text h5>Saved Comparisons</Text>
            </Container>
            <div style={{ maxHeight: currentAvlHeight, overflowX: "hidden", overflowY: "auto" }}>
                {savedComparisons?.map((meta) => (
                    <CompareMetaCard key={meta.id} metadata={{ id: meta.id as number, title: meta.data.title }} />
                ))}
                {savedComparisons?.length === 0 && <Text>No Saved Instances</Text>}
            </div>
        </Container>
    );
}
