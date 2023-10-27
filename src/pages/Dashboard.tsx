import { Grid } from "@nextui-org/react";
import ComparisonCard from "../components/ComparisonCard";
import { useLiveQuery } from "dexie-react-hooks";
import { db as database } from "../context/db";
import { useId } from "react";

export default function Dashboard() {
    const savedComparsions = useLiveQuery(() => database.comparisons.toArray());
    console.log(savedComparsions);
    return (
        <Grid.Container gap={1}>
            <Grid>
                <ComparisonCard />
            </Grid>
            {savedComparsions?.map(item => {
                return <Grid key={item.id || useId()}>
                    <ComparisonCard metadata={{ id: item.id as number, title: item.data.title }} />
                </Grid>
            })}
        </Grid.Container>
    );
}
