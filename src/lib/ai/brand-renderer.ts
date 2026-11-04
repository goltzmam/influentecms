import sharp, { type OverlayOptions } from "sharp";
import { join } from "node:path";
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function brandImage({
  name,
  title,
  color,
  accent,
  kind,
}: {
  name: string;
  title?: string;
  color: string;
  accent: string;
  kind: "logo" | "favicon" | "cover";
}) {
  const width = kind === "cover" ? 1200 : kind === "logo" ? 1000 : 192,
    height = kind === "cover" ? 680 : kind === "logo" ? 200 : 192;
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" rx="${kind === "favicon" ? 36 : 0}" fill="${color}"/>${kind === "cover" ? `<circle cx="1100" cy="40" r="330" fill="${accent}" opacity=".22"/><circle cx="1060" cy="180" r="150" fill="${accent}" opacity=".25"/>` : ""}${kind === "logo" ? `<rect x="25" y="25" width="150" height="150" rx="30" fill="${accent}"/>` : ""}</svg>`,
  );
  const fontfile = join(process.cwd(), "assets/fonts/DejaVuSans-Bold.ttf");
  async function text(
    content: string,
    size: number,
    maxWidth: number,
    maxHeight: number,
    tint: string,
  ) {
    return sharp({
      text: {
        text: `<span foreground="${tint}">${escape(content)}</span>`,
        font: `DejaVu Sans Bold ${size}`,
        fontfile,
        rgba: true,
        width: maxWidth,
        height: maxHeight,
        wrap: "word",
        align: "left",
      },
    })
      .png()
      .toBuffer();
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const overlays: OverlayOptions[] = [];
  if (kind === "cover") {
    overlays.push(
      { input: await text(name, 24, 900, 60, accent), left: 65, top: 55 },
      {
        input: await text(title || name, 52, 1000, 320, "#ffffff"),
        left: 65,
        top: 230,
      },
      {
        input: await text("Ilustração editorial", 18, 600, 35, "#ffffff"),
        left: 65,
        top: 610,
      },
    );
  } else if (kind === "logo") {
    overlays.push(
      { input: await text(initials, 58, 125, 100, color), left: 42, top: 56 },
      { input: await text(name, 64, 750, 125, "#ffffff"), left: 205, top: 40 },
    );
  } else
    overlays.push({
      input: await text(initials, 64, 150, 100, accent),
      left: 22,
      top: 50,
    });
  return sharp(background).composite(overlays).webp({ quality: 90 }).toBuffer();
}
