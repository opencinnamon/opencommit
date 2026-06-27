"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { GitHubOrg, GitHubRepo } from "@/types";
import styles from "./StartClient.module.css";

interface Account {
  login: string;
  avatarUrl: string;
  type: "user" | "org";
}

interface Props {
  username: string;
  avatarUrl: string;
}

export default function StartClient({ username, avatarUrl }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<"accounts" | "repos">("accounts");
  const [fading, setFading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [orgs, setOrgs] = useState<GitHubOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const skeletonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/github/orgs");
        const data = await res.json();
        setOrgs(Array.isArray(data) ? data : []);
      } catch {
        setOrgs([]);
      } finally {
        skeletonTimer.current = setTimeout(() => {
          setOrgsLoading(false);
        }, 1500);
      }
    }
    fetchOrgs();
    return () => {
      if (skeletonTimer.current) clearTimeout(skeletonTimer.current);
    };
  }, []);

  function fadeTransition(cb: () => void) {
    setFading(true);
    setTimeout(() => {
      cb();
      setFading(false);
    }, 280);
  }

  async function selectAccount(account: Account) {
    fadeTransition(async () => {
      setSelectedAccount(account);
      setPhase("repos");
      setLoadingRepos(true);
      try {
        const url =
          account.type === "org"
            ? `/api/repos?org=${account.login}`
            : "/api/repos";
        const res = await fetch(url);
        const data = await res.json();
        setRepos(Array.isArray(data) ? data : []);
      } catch {
        setRepos([]);
      } finally {
        setLoadingRepos(false);
      }
    });
  }

  function openRepo(repo: GitHubRepo) {
    router.push(`/start/${repo.owner.login}/${repo.name}`);
  }

  const allAccounts: Account[] = [
    { login: username, avatarUrl, type: "user" },
    ...orgs.map((o) => ({
      login: o.login,
      avatarUrl: o.avatar_url,
      type: "org" as const,
    })),
  ];

  return (
    <div className={styles.page}>
      <PageHeader username={username} avatarUrl={avatarUrl} />

      <main className={`${styles.main} ${fading ? styles.fadingOut : styles.fadingIn}`}>
        {phase === "accounts" ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Choose an account</h2>

            <div className={styles.accountList}>
              <button
                className={styles.accountCard}
                onClick={() =>
                  selectAccount({ login: username, avatarUrl, type: "user" })
                }
              >
                <Image
                  src={avatarUrl}
                  alt={username}
                  width={40}
                  height={40}
                  className={styles.accountAvatar}
                />
                <div className={styles.accountInfo}>
                  <span className={styles.accountName}>{username}</span>
                  <span className={styles.accountType}>Personal account</span>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" className={styles.chevron}>
                  <path d="M9 18L15 12L9 6" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {orgsLoading ? (
                <>
                  <div className={`${styles.accountCard} ${styles.skeletonCard}`}>
                    <div className={`${styles.skeletonAvatar} skeleton`} />
                    <div className={styles.skeletonLines}>
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "120px" }} />
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "80px" }} />
                    </div>
                  </div>
                  <div className={`${styles.accountCard} ${styles.skeletonCard}`}>
                    <div className={`${styles.skeletonAvatar} skeleton`} />
                    <div className={styles.skeletonLines}>
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "100px" }} />
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "70px" }} />
                    </div>
                  </div>
                </>
              ) : (
                allAccounts.slice(1).map((acc) => (
                  <button
                    key={acc.login}
                    className={styles.accountCard}
                    onClick={() => selectAccount(acc)}
                  >
                    <Image
                      src={acc.avatarUrl}
                      alt={acc.login}
                      width={40}
                      height={40}
                      className={styles.accountAvatar}
                    />
                    <div className={styles.accountInfo}>
                      <span className={styles.accountName}>{acc.login}</span>
                      <span className={styles.accountType}>Organization</span>
                    </div>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" className={styles.chevron}>
                      <path d="M9 18L15 12L9 6" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className={styles.section}>
            <div className={styles.repoHeader}>
              <div className={styles.repoHeaderLeft}>
                <button
                  className={styles.backBtn}
                  onClick={() => fadeTransition(() => setPhase("accounts"))}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Back
                </button>
                <h2 className={styles.sectionTitle}>Repository list</h2>
              </div>
              {selectedAccount && (
                <div className={styles.activeAccount}>
                  <Image
                    src={selectedAccount.avatarUrl}
                    alt={selectedAccount.login}
                    width={22}
                    height={22}
                    className={styles.miniAvatar}
                  />
                  <span>{selectedAccount.login}</span>
                </div>
              )}
            </div>

            {loadingRepos ? (
              <div className={styles.repoList}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`${styles.repoCard} ${styles.skeletonCard}`}>
                    <div className={styles.skeletonLines}>
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "160px", height: "14px" }} />
                      <div className={`${styles.skeletonLine} skeleton`} style={{ width: "240px", height: "11px" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : repos.length === 0 ? (
              <p className={styles.empty}>No repositories found.</p>
            ) : (
              <div className={styles.repoList}>
                {repos.map((repo) => (
                  <button
                    key={repo.id}
                    className={styles.repoCard}
                    onClick={() => openRepo(repo)}
                  >
                    <div className={styles.repoTop}>
                      <span className={styles.repoName}>{repo.name}</span>
                      {repo.private && (
                        <span className={styles.privateBadge}>Private</span>
                      )}
                      {repo.language && (
                        <span className={styles.langBadge}>{repo.language}</span>
                      )}
                    </div>
                    {repo.description && (
                      <p className={styles.repoDesc}>{repo.description}</p>
                    )}
                    <div className={styles.repoMeta}>
                      {repo.license && (
                        <span className={styles.metaItem}>
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                            <path d="M12 2L3 7V12C3 16.418 7.03 20.5 12 22C16.97 20.5 21 16.418 21 12V7L12 2Z" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {repo.license.name}
                        </span>
                      )}
                      <span className={styles.metaItem}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                          <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" stroke="#555" strokeWidth="2"/>
                          <path d="M12 6V12L16 14" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {new Date(repo.updated_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span className={styles.metaItem}>
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {repo.stargazers_count}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
