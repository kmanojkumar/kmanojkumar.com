import { execSync } from "node:child_process";

function readGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const commit = readGitCommit();

export const gitCommit = commit || "local";
export const hasGitCommit = commit !== "";
