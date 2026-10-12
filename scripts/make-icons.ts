// npm run icons
//
// Makes favicon.ico (16, 32 and 48 px) and apple-icon.png (180 px) from
// app/icon.svg. Run after changing the icon; the files are committed.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("app/icon.svg");
const png = (size: number) =>
  sharp(svg, { density: 72 * (size / 64) * 4 })
    .resize(size, size)
    .png()
    .toBuffer();

// An .ico may hold PNG images: a 6-byte header, a 16-byte entry per image,
// then the images one after another.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + 16 * images.length;
const entries = images.map((image, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(sizes[index]!, 0);
  entry.writeUInt8(sizes[index]!, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.length;
  return entry;
});
await writeFile(
  "app/favicon.ico",
  Buffer.concat([header, ...entries, ...images]),
);

// iOS draws its own rounded corners: a plain square, no transparency.
await writeFile(
  "app/apple-icon.png",
  await sharp(svg, { density: 72 * (180 / 64) * 2 })
    .resize(180, 180)
    .flatten({ background: "#2d46e6" })
    .png()
    .toBuffer(),
);
console.log("app/favicon.ico and app/apple-icon.png are made.");
