import { GitHubContent, GitHubOrg, GitHubRepo } from "@/types";

const BASE = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getAuthenticatedUser(token: string) {
  const res = await fetch(`${BASE}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function getUserOrgs(token: string): Promise<GitHubOrg[]> {
  const res = await fetch(`${BASE}/user/orgs?per_page=100`, {
    headers: headers(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/user/repos?per_page=100&sort=updated&affiliation=owner`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch repos");
  return res.json();
}

export async function getOrgRepos(
  token: string,
  org: string
): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${BASE}/orgs/${org}/repos?per_page=100&sort=updated`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch org repos");
  return res.json();
}

export async function getRepoContents(
  token: string,
  owner: string,
  repo: string,
  path = ""
): Promise<GitHubContent[]> {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    headers: headers(token),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Failed to fetch contents");
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string; encoding: string }> {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    headers: headers(token),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error("Failed to fetch file");
  return res.json();
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
) {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create/update file");
  }
  return res.json();
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string
) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to delete file");
  }
  return res.json();
}

export async function checkRepoAccess(
  token: string,
  owner: string,
  repo: string
): Promise<{ canRead: boolean; canWrite: boolean; isPrivate: boolean }> {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}`, {
    headers: headers(token),
  });
  if (!res.ok) return { canRead: false, canWrite: false, isPrivate: true };
  const data = await res.json();
  const perms = data.permissions || {};
  return {
    canRead: true,
    canWrite: perms.push === true || perms.admin === true,
    isPrivate: data.private,
  };
}

export function isCodeFile(name: string): boolean {
  const codeExts = [
    ".js",".ts",".tsx",".jsx",".py",".go",".rs",".java",".c",".cpp",
    ".h",".cs",".rb",".php",".swift",".kt",".html",".css",".scss",
    ".sass",".less",".vue",".svelte",".json",".yaml",".yml",".toml",
    ".xml",".sh",".bash",".zsh",".fish",".sql",".graphql",".env",
    ".gitignore",".dockerignore",".editorconfig",
  ];
  const lower = name.toLowerCase();
  return codeExts.some((ext) => lower.endsWith(ext));
}

export function isDocFile(name: string): boolean {
  const docNames = [
    "readme",
    "readme.md",
    "license",
    "license.md",
    "licence",
    "code_of_conduct",
    "code_of_conduct.md",
    "contributing",
    "contributing.md",
    "changelog",
    "changelog.md",
    "security",
    "security.md",
  ];
  return docNames.includes(name.toLowerCase());
}

export function getLanguageFromExt(filename: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "tsx",
    jsx: "jsx",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    vue: "vue",
    svelte: "svelte",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
    graphql: "graphql",
    md: "markdown",
  };
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return map[ext] || "text";
}
