/**
 * Renders Kochi's app icons from one drawing of the brand mark (the sun-yellow
 * bumper plate in src/components/brand-mark.tsx). Run `npm run icons` after
 * changing the mark or the brand colours; the outputs are committed.
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const NAVY = "#10143a"; // dark theme background
const SUN = "#f2b631";
const INK = "#1b2150";

/** The plate, centred on a 512 canvas. `scale` 1 fills ~66%, inside the maskable safe zone. */
function plate(scale = 1, shadow = true) {
  const r = 168 * scale;
  return `
    ${shadow ? `<filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${14 * scale}"/></filter>
    <circle cx="256" cy="${256 + 16 * scale}" r="${r}" fill="#000" opacity="0.45" filter="url(#s)"/>` : ""}
    <circle cx="256" cy="256" r="${r}" fill="${SUN}"/>
    <circle cx="256" cy="256" r="${r * 0.7}" fill="none" stroke="${INK}" stroke-opacity="0.25" stroke-width="${r * 0.1}"/>
    <circle cx="256" cy="256" r="${r * 0.2333}" fill="${INK}"/>`;
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${body}</svg>`;

/** Home-screen / install icon: navy rounded square. */
const appIcon = svg(`<rect width="512" height="512" rx="112" fill="${NAVY}"/>${plate()}`);
/** Maskable and Apple icons: full bleed (the OS applies its own shape). */
const fullBleed = svg(`<rect width="512" height="512" fill="${NAVY}"/>${plate()}`);
/** Browser tab: the plate alone, edge to edge, readable on light and dark tabs. */
const tab = svg(plate(256 / 168, false));

const png = (source, size) => sharp(Buffer.from(source)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** An .ico holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const outputs = {
  "public/icon-192x192.png": await png(appIcon, 192),
  "public/icon-512x512.png": await png(appIcon, 512),
  "public/icon-maskable-512x512.png": await png(fullBleed, 512),
  "src/app/apple-icon.png": await png(fullBleed, 180),
  "src/app/icon.svg": Buffer.from(tab.replace('width="512" height="512" ', "")),
  "src/app/favicon.ico": ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tab, size) })))),
  "assets/brand/kochi-icon.svg": Buffer.from(appIcon),
};
for (const [path, data] of Object.entries(outputs)) {
  await writeFile(path, data);
  console.log(`${path} (${data.length} bytes)`);
}
