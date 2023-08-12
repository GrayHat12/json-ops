import { Container, CSS } from "@nextui-org/react";
import styles from "./loading.module.css";

export interface Props {
    css?: CSS;
}

export default function Loading(props: Props) {
    return (
        <Container css={props.css} className={styles.fullpage}>
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
