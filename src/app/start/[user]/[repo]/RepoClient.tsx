"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Logo from "@/components/Logo";
import UserMenu from "@/components/UserMenu";
import {
  FolderIcon,
  CodeFileIcon,
  DocFileIcon,
  NewFolderIcon,
  NoMoreIcon,
  TrashIcon,
  ErrorIcon,
  LoadMoreIcon,
} from "@/components/Icons";
import { GitHubContent } from "@/types";
import { isCodeFile, isDocFile, getLanguageFromExt, isImageFile, isAudioFile, getImageMimeType, getAudioMimeType } from "@/lib/github";
import styles from "./RepoClient.module.css";

interface Props {
  owner: string;
  repoName: string;
  initialContents: GitHubContent[];
  canWrite: boolean;
  sessionUser: { username: string; avatarUrl: string } | null;
}

type View =
  | { kind: "explorer" }
  | { kind: "file"; path: string; content: string; sha: string; lang: string }
  | { kind: "image"; path: string; sha: string; dataUrl: string; name: string }
  | { kind: "audio"; path: string; sha: string; dataUrl: string; name: string; mimeType: string }
  | { kind: "create-folder"; parentPath: string }
  | { kind: "edit"; path: string; content: string; sha: string };

interface FolderState {
  items: GitHubContent[];
  shown: number;
  loading: boolean;
  error: boolean;
}

const PAGE_SIZE = 5;

export default function RepoClient({
  owner,
  repoName,
  initialContents,
  canWrite,
  sessionUser,
}: Props) {
  const [fading, setFading] = useState(false);
  const [view, setView] = useState<View>({ kind: "explorer" });
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [pathContents, setPathContents] = useState<Record<string, FolderState>>({
    "": { items: initialContents, shown: PAGE_SIZE, loading: false, error: false },
  });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<{ path: string; sha: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderError, setCreateFolderError] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [editContent, setEditContent] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [fileError, setFileError] = useState("");

  function fade(cb: () => void) {
    setFading(true);
    setTimeout(() => {
      cb();
      setFading(false);
    }, 260);
  }

  const loadFolder = useCallback(
    async (path: string) => {
      if (pathContents[path]) return;
      setPathContents((prev) => ({
        ...prev,
        [path]: { items: [], shown: PAGE_SIZE, loading: true, error: false },
      }));
      try {
        const res = await fetch(
          `/api/repo/contents?owner=${owner}&repo=${repoName}&path=${encodeURIComponent(path)}`
        );
        const data = await res.json();
        const items: GitHubContent[] = data.contents || [];
        items.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "dir" ? -1 : 1;
        });
        setPathContents((prev) => ({
          ...prev,
          [path]: { items, shown: PAGE_SIZE, loading: false, error: false },
        }));
      } catch {
        setPathContents((prev) => ({
          ...prev,
          [path]: { items: [], shown: PAGE_SIZE, loading: false, error: true },
        }));
      }
    },
    [owner, repoName, pathContents]
  );

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        loadFolder(path);
      }
      return next;
    });
  }

  function loadMore(path: string) {
    setPathContents((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        shown: (prev[path]?.shown ?? PAGE_SIZE) + PAGE_SIZE,
      },
    }));
  }

  async function openFile(item: GitHubContent) {
    setFileError("");
    fade(async () => {
      try {
        const res = await fetch(
          `/api/repo/file?owner=${owner}&repo=${repoName}&path=${encodeURIComponent(item.path)}`
        );
        const data = await res.json();

        if (isImageFile(item.name)) {
          const mime = getImageMimeType(item.name);
          const dataUrl = data.content
            ? `data:${mime};base64,${data.content.replace(/\n/g, "")}`
            : "";
          setView({ kind: "image", path: item.path, sha: data.sha, dataUrl, name: item.name });
          return;
        }

        if (isAudioFile(item.name)) {
          const mime = getAudioMimeType(item.name);
          const dataUrl = data.content
            ? `data:${mime};base64,${data.content.replace(/\n/g, "")}`
            : "";
          setView({ kind: "audio", path: item.path, sha: data.sha, dataUrl, name: item.name, mimeType: mime });
          return;
        }

        const raw = data.content
          ? decodeURIComponent(
              Array.from(atob(data.content.replace(/\n/g, "")))
                .map((c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
            )
          : "";
        setView({
          kind: "file",
          path: item.path,
          content: raw,
          sha: data.sha,
          lang: getLanguageFromExt(item.name),
        });
      } catch {
        setFileError("Something went wrong.");
        setView({ kind: "explorer" });
      }
    });
  }

  function startEdit(content: string, path: string, sha: string) {
    setEditContent(content);
    setCommitMsg("");
    setSaveError("");
    setView({ kind: "edit", path, content, sha });
  }

  async function saveEdit(path: string, sha: string) {
    if (!commitMsg.trim()) {
      setSaveError("Please enter a commit message.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/repo/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          path,
          content: editContent,
          message: commitMsg,
          sha,
        }),
      });
      if (!res.ok) throw new Error();
      const updatedRes = await fetch(
        `/api/repo/file?owner=${owner}&repo=${repoName}&path=${encodeURIComponent(path)}`
      );
      const updated = await updatedRes.json();
      const raw = updated.content
        ? decodeURIComponent(
            Array.from(atob(updated.content.replace(/\n/g, "")))
              .map((c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          )
        : "";
      const name = path.split("/").pop() || path;
      fade(() => {
        setView({ kind: "file", path, content: raw, sha: updated.sha, lang: getLanguageFromExt(name) });
      });
    } catch {
      setSaveError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/repo/file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          path: deleteTarget.path,
          sha: deleteTarget.sha,
          message: `Delete ${deleteTarget.name}`,
        }),
      });
      if (!res.ok) throw new Error();
      const parentPath = deleteTarget.path.split("/").slice(0, -1).join("/");
      setPathContents((prev) => {
        const state = prev[parentPath];
        if (!state) return prev;
        return {
          ...prev,
          [parentPath]: {
            ...state,
            items: state.items.filter((i) => i.path !== deleteTarget.path),
          },
        };
      });
      setDeleteTarget(null);
      fade(() => setView({ kind: "explorer" }));
    } catch {
      setDeleting(false);
    } finally {
      setDeleting(false);
    }
  }

  async function createFolder(parentPath: string) {
    if (!newFolderName.trim()) {
      setCreateFolderError("Please enter a folder name.");
      return;
    }
    setCreatingFolder(true);
    setCreateFolderError("");
    const folderPath = parentPath
      ? `${parentPath}/${newFolderName.trim()}/.gitkeep`
      : `${newFolderName.trim()}/.gitkeep`;
    try {
      const res = await fetch("/api/repo/file", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          path: folderPath,
          content: "",
          message: `Create folder ${newFolderName.trim()}`,
        }),
      });
      if (!res.ok) throw new Error();
      setPathContents((prev) => {
        const { [parentPath]: removed, ...rest } = prev;
        void removed;
        return rest;
      });
      setNewFolderName("");
      setCreatingFolder(false);
      fade(() => setView({ kind: "explorer" }));
    } catch {
      setCreateFolderError("Something went wrong.");
      setCreatingFolder(false);
    }
  }

  function renderFileIcon(item: GitHubContent) {
    if (item.type === "dir") return <FolderIcon />;
    if (isDocFile(item.name)) return <DocFileIcon />;
    if (isCodeFile(item.name)) return <CodeFileIcon />;
    if (isImageFile(item.name)) return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#6b7280" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#6b7280"/>
        <path d="M3 15L8 10L12 14L15 11L21 17" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    if (isAudioFile(item.name)) return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M9 18V5l12-2v13" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="18" r="3" stroke="#6b7280" strokeWidth="2"/>
        <circle cx="18" cy="16" r="3" stroke="#6b7280" strokeWidth="2"/>
      </svg>
    );
    return <DocFileIcon />;
  }

  function renderTree(path: string, depth: number = 0): React.ReactNode {
    const state = pathContents[path];
    if (!state) return null;

    const sorted = [...state.items].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    });

    const visible = sorted.slice(0, state.shown);
    const hasMore = sorted.length > state.shown;
    const atEnd = !hasMore && sorted.length > 0;

    return (
      <div className={styles.treeLevel} style={{ paddingLeft: depth > 0 ? "1rem" : "0" }}>
        {state.loading && (
          <div className={styles.treeLoading}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`${styles.skeletonRow} skeleton`} />
            ))}
          </div>
        )}
        {state.error && (
          <div className={styles.treeError}>
            <ErrorIcon />
            <span>Something went wrong.</span>
          </div>
        )}
        {visible.map((item) => (
          <div key={item.path}>
            <button
              className={styles.treeItem}
              onClick={() => {
                if (item.type === "dir") {
                  toggleFolder(item.path);
                } else {
                  openFile(item);
                }
              }}
            >
              {renderFileIcon(item)}
              <span className={styles.treeItemName}>{item.name}</span>
              {item.type === "dir" && (
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  className={`${styles.folderChevron} ${expandedFolders.has(item.path) ? styles.expanded : ""}`}
                >
                  <path d="M9 18L15 12L9 6" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            {item.type === "dir" && expandedFolders.has(item.path) && (
              <div>{renderTree(item.path, depth + 1)}</div>
            )}
          </div>
        ))}
        {(hasMore || atEnd) && (
          <div className={styles.loadMoreRow}>
            {hasMore ? (
              <button className={styles.loadMoreBtn} onClick={() => loadMore(path)}>
                <LoadMoreIcon />
                Load more
              </button>
            ) : (
              <>
                <span className={styles.noMore}>
                  <NoMoreIcon />
                  No more.
                </span>
                {canWrite && (
                  <button
                    className={styles.createOneBtn}
                    onClick={() => fade(() => setView({ kind: "create-folder", parentPath: path }))}
                  >
                    Create one?
                    <NewFolderIcon />
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {sorted.length === 0 && !state.loading && !state.error && canWrite && (
          <div className={styles.loadMoreRow}>
            <span className={styles.noMore}>
              <NoMoreIcon />
              No more.
            </span>
            <button
              className={styles.createOneBtn}
              onClick={() => fade(() => setView({ kind: "create-folder", parentPath: path }))}
            >
              Create one?
              <NewFolderIcon />
            </button>
          </div>
        )}
      </div>
    );
  }

  const breadcrumbParts =
    view.kind === "file" || view.kind === "edit"
      ? view.path.split("/")
      : [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/start" className={styles.backBtn}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </a>
          <Logo />
        </div>
        {sessionUser && (
          <UserMenu username={sessionUser.username} avatarUrl={sessionUser.avatarUrl} />
        )}
      </header>

      <div className={`${styles.body} ${fading ? styles.fadingOut : styles.fadingIn}`}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>{owner} / {repoName}</span>
          </div>
          {renderTree("")}
        </aside>

        <main className={styles.content}>
          {view.kind === "explorer" && (
            <div className={styles.explorerEmpty}>
              {fileError && (
                <div className={styles.errorMsg}>
                  <ErrorIcon />
                  {fileError}
                </div>
              )}
              {!fileError && (
                <p className={styles.selectHint}>Select a file to view it.</p>
              )}
            </div>
          )}

          {view.kind === "file" && (
            <div className={styles.fileView}>
              <div className={styles.fileBreadcrumb}>
                <button
                  className={styles.breadcrumbLink}
                  onClick={() => fade(() => setView({ kind: "explorer" }))}
                >
                  {owner}
                </button>
                {breadcrumbParts.map((part, i) => (
                  <span key={i} className={styles.breadcrumbPart}>
                    <span className={styles.breadcrumbSep}>/</span>
                    {i === breadcrumbParts.length - 1 ? (
                      <span className={styles.breadcrumbCurrent}>{part}</span>
                    ) : (
                      <span>{part}</span>
                    )}
                  </span>
                ))}
              </div>

              {canWrite && (
                <div className={styles.fileActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => startEdit(view.content, view.path, view.sha)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() =>
                      setDeleteTarget({
                        path: view.path,
                        sha: view.sha,
                        name: breadcrumbParts[breadcrumbParts.length - 1],
                      })
                    }
                  >
                    <TrashIcon />
                    Delete
                  </button>
                </div>
              )}

              <div className={styles.codeBlock}>
                <pre className={styles.pre}>
                  <code className={`language-${view.lang}`}>{view.content}</code>
                </pre>
              </div>
            </div>
          )}

          {view.kind === "edit" && (
            <div className={styles.editView}>
              <div className={styles.fileBreadcrumb}>
                <button
                  className={styles.breadcrumbLink}
                  onClick={() => fade(() => setView({ kind: "explorer" }))}
                >
                  {owner}
                </button>
                {view.path.split("/").map((part, i, arr) => (
                  <span key={i} className={styles.breadcrumbPart}>
                    <span className={styles.breadcrumbSep}>/</span>
                    {i === arr.length - 1 ? (
                      <span className={styles.breadcrumbCurrent}>{part}</span>
                    ) : (
                      <span>{part}</span>
                    )}
                  </span>
                ))}
              </div>

              <textarea
                className={styles.editTextarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              <div className={styles.commitRow}>
                <input
                  className={styles.commitInput}
                  placeholder="Commit message…"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                />
                <button
                  className={styles.saveBtn}
                  onClick={() => saveEdit(view.path, view.sha)}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Commit"}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => fade(() => setView({ kind: "explorer" }))}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>

              {saveError && (
                <div className={styles.errorMsg}>
                  <ErrorIcon />
                  {saveError}
                </div>
              )}
            </div>
          )}

          {view.kind === "image" && (
            <div className={styles.mediaView}>
              <div className={styles.fileBreadcrumb}>
                <button className={styles.breadcrumbLink} onClick={() => fade(() => setView({ kind: "explorer" }))}>
                  {owner}
                </button>
                {view.path.split("/").map((part, i, arr) => (
                  <span key={i} className={styles.breadcrumbPart}>
                    <span className={styles.breadcrumbSep}>/</span>
                    {i === arr.length - 1 ? <span className={styles.breadcrumbCurrent}>{part}</span> : <span>{part}</span>}
                  </span>
                ))}
              </div>
              <div className={styles.mediaActions}>
                <a href={view.dataUrl} download={view.name} className={styles.editBtn}>
                  Download
                </a>
                {canWrite && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget({ path: view.path, sha: view.sha, name: view.name })}
                  >
                    <TrashIcon />
                    Delete
                  </button>
                )}
              </div>
              <div className={styles.imageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={view.dataUrl} alt={view.name} className={styles.imagePreview} />
              </div>
            </div>
          )}

          {view.kind === "audio" && (
            <div className={styles.mediaView}>
              <div className={styles.fileBreadcrumb}>
                <button className={styles.breadcrumbLink} onClick={() => fade(() => setView({ kind: "explorer" }))}>
                  {owner}
                </button>
                {view.path.split("/").map((part, i, arr) => (
                  <span key={i} className={styles.breadcrumbPart}>
                    <span className={styles.breadcrumbSep}>/</span>
                    {i === arr.length - 1 ? <span className={styles.breadcrumbCurrent}>{part}</span> : <span>{part}</span>}
                  </span>
                ))}
              </div>
              <div className={styles.mediaActions}>
                <a href={view.dataUrl} download={view.name} className={styles.editBtn}>
                  Download
                </a>
                {canWrite && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget({ path: view.path, sha: view.sha, name: view.name })}
                  >
                    <TrashIcon />
                    Delete
                  </button>
                )}
              </div>
              <div className={styles.audioWrap}>
                <div className={styles.audioName}>{view.name}</div>
                <audio controls className={styles.audioPlayer} src={view.dataUrl}>
                  Your browser does not support audio.
                </audio>
              </div>
            </div>
          )}

          {view.kind === "create-folder" && (
            <div className={styles.createFolderView}>
              <Logo />
              <h2 className={styles.createFolderTitle}>New folder</h2>
              <input
                className={styles.folderInput}
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder(view.parentPath);
                }}
              />
              <button
                className={styles.createFolderBtn}
                onClick={() => createFolder(view.parentPath)}
                disabled={creatingFolder}
              >
                {creatingFolder ? "Creating…" : "Create folder"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => fade(() => setView({ kind: "explorer" }))}
                disabled={creatingFolder}
              >
                Cancel
              </button>
              {createFolderError && (
                <div className={styles.errorMsg}>
                  <ErrorIcon />
                  {createFolderError}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Are you sure?</h3>
            <p className={styles.modalDesc}>
              If you delete this file, all the code will be gone!
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalRed}
                onClick={deleteItem}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, do it!"}
              </button>
              <button
                className={styles.modalBlue}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                No! I don&apos;t want to!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
