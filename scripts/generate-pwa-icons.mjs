import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "public", "icon.svg");
const outputDir = path.join(root, "public", "icons");

const svg = await readFile(source);
await mkdir(outputDir, { recursive: true });

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, padding: 0.18 },
];

for (const { name, size, padding = 0 } of sizes) {
  const inset = Math.round(size * padding);
  const inner = size - inset * 2;

  await sharp(svg)
    .resize(inner, inner, { fit: "contain", background: "#2f6f4e" })
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: "#2f6f4e",
    })
    .png()
    .toFile(path.join(outputDir, name));
}

console.log("Generated PWA icons in public/icons");
