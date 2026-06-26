import Link from "next/link";
import Logo from "@/components/Logo";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <Logo />
      <p className={styles.code}>404</p>
      <p className={styles.msg}>This repo doesn&apos;t exist, or you don&apos;t have access.</p>
      <Link href="/start" className={styles.back}>← Back</Link>
    </div>
  );
}
