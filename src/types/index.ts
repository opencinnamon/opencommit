export interface SessionUser {
  githubId: number;
  username: string;
  avatarUrl: string;
  accessToken: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: { login: string; avatar_url: string };
  license: { name: string } | null;
  language: string | null;
  updated_at: string;
  stargazers_count: number;
}

export interface GitHubOrg {
  id: number;
  login: string;
  avatar_url: string;
  description: string | null;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
  content?: string;
  encoding?: string;
  download_url: string | null;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}
