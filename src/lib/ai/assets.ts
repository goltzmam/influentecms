import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiBlueprint } from "./schema";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function wrap(text: string, max = 40) {
  const rows: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = rows.at(-1);
    if (!last || last.length + word.length > max) rows.push(word);
    else rows[rows.length - 1] += " " + word;
  }
  return rows.slice(0, 4);
}
export async function createBrandAssets(
  client: SupabaseClient,
  organizationId: string,
  portalId: string,
  plan: AiBlueprint,
) {
  const warnings: string[] = [];
  const { color, accentColor, surfaceColor } = plan.identity;
  async function upload(name: string, svg: string) {
    let path = "";
    try {
      const bytes = await sharp(Buffer.from(svg))
        .webp({ quality: 90 })
        .toBuffer();
      path = `${organizationId}/${portalId}/${crypto.randomUUID()}.webp`;
      const result = await client.storage
        .from("portal-media")
        .upload(path, bytes, { contentType: "image/webp", upsert: false });
      if (result.error) throw result.error;
      const url = client.storage.from("portal-media").getPublicUrl(path)
        .data.publicUrl;
      const row = await client
        .from("media")
        .insert({
          organization_id: organizationId,
          portal_id: portalId,
          name,
          path,
          url,
          size: bytes.length,
        });
      if (row.error) throw row.error;
      return url;
    } catch {
      if (path) await client.storage.from("portal-media").remove([path]);
      warnings.push(
        `Não foi possível salvar ${name}. Você pode enviar o arquivo pela biblioteca de mídia.`,
      );
      return "";
    }
  }
  const initials = escape(
    plan.name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
  );
  const logo = await upload(
    "Logotipo tipográfico gerado",
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200"><rect width="1000" height="200" fill="${color}"/><rect x="25" y="25" width="150" height="150" rx="28" fill="${accentColor}"/><text x="100" y="122" text-anchor="middle" font-family="sans-serif" font-size="58" font-weight="700" fill="${color}">${initials}</text><text x="205" y="123" font-family="sans-serif" font-size="${Math.min(68, Math.max(10, 760 / (plan.name.length * 0.6)))}" font-weight="700" fill="${surfaceColor}">${escape(plan.name)}</text></svg>`,
  );
  const favicon = await upload(
    "Ícone de marca gerado",
    `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" rx="40" fill="${color}"/><text x="96" y="125" text-anchor="middle" font-family="sans-serif" font-size="68" font-weight="700" fill="${accentColor}">${initials}</text></svg>`,
  );
  const covers: Record<string, string> = {};
  for (const article of plan.articles) {
    const title = wrap(article.title);
    const cover = await upload(
      `Ilustração de marca: ${article.title}`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680"><rect width="1200" height="680" fill="${color}"/><circle cx="1140" cy="80" r="300" fill="${accentColor}" opacity=".23"/><circle cx="1070" cy="210" r="150" fill="${accentColor}" opacity=".35"/><text x="65" y="80" font-family="sans-serif" font-size="24" fill="${accentColor}">${escape(plan.name)}</text>${title.map((line, n) => `<text x="65" y="${290 + n * 65}" font-family="sans-serif" font-size="50" font-weight="700" fill="white">${escape(line)}</text>`).join("")}<text x="65" y="625" font-family="sans-serif" font-size="20" fill="white" opacity=".7">Ilustração editorial</text></svg>`,
    );
    if (cover) covers[article.slug] = cover;
  }
  return { logo, favicon, covers, warnings };
}
