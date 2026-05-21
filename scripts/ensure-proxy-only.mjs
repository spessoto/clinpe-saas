import { access, rm } from "node:fs/promises";

const candidates = [
  "middleware.ts",
  "src/middleware.ts",
  "src/src/middleware.ts",
];

async function removeIfExists(path) {
  try {
    await access(path);
    await rm(path, { force: true });
    console.log(`[prebuild] removed stale file: ${path}`);
  } catch {
    // File does not exist in this environment; ignore.
  }
}

await Promise.all(candidates.map(removeIfExists));
