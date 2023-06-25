import { Container } from "@nextui-org/react";
import styles from "./loading.module.css";

export default function Loading() {
    return (
        <Container className={styles.fullpage}>
            <Container className={styles["sk-chase"]}>
                <div className={styles["sk-chase-dot"]}></div>
                <div className={styles["sk-chase-dot"]}></div>
                <div className={styles["sk-chase-dot"]}></div>
                <div className={styles["sk-chase-dot"]}></div>
                <div className={styles["sk-chase-dot"]}></div>
                <div className={styles["sk-chase-dot"]}></div>
            </Container>
        </Container>
    );
}
