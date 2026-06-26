import Logo from "./Logo";
import UserMenu from "./UserMenu";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  username: string;
  avatarUrl: string;
}

export default function PageHeader({ username, avatarUrl }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <Logo />
      <UserMenu username={username} avatarUrl={avatarUrl} />
    </header>
  );
}
