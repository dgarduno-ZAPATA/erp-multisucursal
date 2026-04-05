/**
 * Genera íconos PNG para el manifest PWA a partir de icon.svg.
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const out = join(root, `public/icons/icon-${size}x${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Maskable: mismo SVG con padding 10% (safe zone)
const maskable_sizes = [192, 512];
for (const size of maskable_sizes) {
  const safe = Math.round(size * 0.8);
  const offset = Math.round((size - safe) / 2);
  const out = join(root, `public/icons/icon-${size}x${size}-maskable.png`);
  await sharp(svg)
    .resize(safe, safe)
    .extend({ top: offset, bottom: offset, left: offset, right: offset, background: "#0f172a" })
    .png()
    .toFile(out);
  console.log(`✓ icon-${size}x${size}-maskable.png`);
}

console.log("\nÍconos generados en public/icons/");
