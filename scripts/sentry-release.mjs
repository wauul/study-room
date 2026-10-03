import { execFileSync } from "node:child_process";
export function sentryRelease() {
  const configured = process.env.SENTRY_RELEASE;
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    (() => {
      try {
        return execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
      } catch {
        return "";
      }
    })();
  const release =
    configured || (sha ? `study-room@${sha}` : "study-room@local");
  if (!/^study-room@(?:[a-f0-9]{7,40}|local)$/.test(release))
    throw new Error("SENTRY_RELEASE must be study-room@<commit SHA>");
  return release;
}
