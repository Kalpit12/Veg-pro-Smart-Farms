/**
 * Local dev: more Node heap + Turbopack (lower RAM / faster than webpack).
 * PWA icons generate once unless public/icons is missing.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iconPng = resolve(root, "public", "icons", "icon-192.png");

const existingNodeOptions = process.env.NODE_OPTIONS?.trim() ?? "";
if (!/max-old-space-size/i.test(existingNodeOptions)) {
  process.env.NODE_OPTIONS = `${existingNodeOptions} --max-old-space-size=4096`.trim();
}

if (!existsSync(iconPng)) {
  console.log(">> Generating PWA icons (first run)…");
  execSync("node scripts/generate-pwa-icons.mjs", { cwd: root, stdio: "inherit" });
}

const useWebpack = process.env.NEXT_DEV_WEBPACK === "1";
const nextArgs = useWebpack ? ["dev"] : ["dev", "--turbo"];

console.log(
  useWebpack
    ? ">> next dev (webpack). Set NEXT_DEV_WEBPACK=0 for Turbopack."
    : ">> next dev --turbo (set NEXT_DEV_WEBPACK=1 to use webpack)",
);

const child = spawn("npx", ["next", ...nextArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
