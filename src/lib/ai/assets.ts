import "server-only";
import sharp from "sharp";
import { readPublicResource } from "../clone/web";
import {
  editorialIllustration,
  demonstrationArt,
  generatedVisual,
} from "./visuals";
import { brandImage } from "./brand-renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiBlueprint } from "./schema";
export async function createBrandAssets(
  client: SupabaseClient,
  organizationId: string,
  portalId: string,
  plan: AiBlueprint,
) {
  const warnings: string[] = [];
  const existing = await client
    .from("media")
    .select("name,url")
    .eq("portal_id", portalId);
  const known = new Map((existing.data || []).map((m) => [m.name, m.url]));
  let generatedCount = 0,
    illustratedCount = 0;
  const imageBudget = AbortSignal.timeout(85000);
  const { color, accentColor, surfaceColor } = plan.identity;
  async function upload(name: string, render: () => Promise<Buffer>) {
    if (known.has(name)) return known.get(name)!;
    let path = "";
    try {
      const bytes = await render();
      path = `${organizationId}/${portalId}/${crypto.randomUUID()}.webp`;
      const result = await client.storage
        .from("portal-media")
        .upload(path, bytes, { contentType: "image/webp", upsert: false });
      if (result.error) throw result.error;
      const url = client.storage.from("portal-media").getPublicUrl(path)
        .data.publicUrl;
      const row = await client.from("media").insert({
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
  async function importedImage(url: string) {
    const resource = await readPublicResource(url, "image", imageBudget);
    return sharp(resource.bytes, {limitInputPixels:20000000, animated:false}).rotate().resize({width:1800,withoutEnlargement:true}).webp({quality:88}).toBuffer();
  }
  const logo = await upload(plan.clone ? "Logotipo do clone" : "Logotipo tipográfico gerado", () =>
    plan.clone?.logo ? importedImage(plan.clone.logo).catch(() => {
      warnings.push("O logotipo original não pôde ser importado; foi criada uma marca editável.");
      return brandImage({ name: plan.name, color, accent: accentColor, kind: "logo" });
    }) : brandImage({ name: plan.name, color, accent: accentColor, kind: "logo" }),
  );
  const favicon = await upload("Ícone de marca gerado", () =>
    brandImage({
      name: plan.name,
      color,
      accent: accentColor,
      kind: "favicon",
    }),
  );
  const importedCovers = new Set<string>();
  const covers: Record<string, string> = {};
  const coverAlts: Record<string, string> = {};
  const pending = [...plan.articles];
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      for (let article = pending.shift(); article; article = pending.shift()) {
        const current = article;
        const cover = await upload(
          `${plan.clone ? "Imagem do clone" : "Ilustração editorial FLUE"}: ${current.title}`,
          async () => {
            if (plan.clone?.covers[current.slug]) {
              try { const bytes = await importedImage(plan.clone.covers[current.slug]); importedCovers.add(current.slug); return bytes; }
              catch { warnings.push(`A imagem de “${current.title.slice(0,100)}” não pôde ser copiada; substitua pela biblioteca de mídia.`); }
            }
            const generated = plan.clone ? null : await generatedVisual(
              `${plan.name}. ${current.title}. ${current.imagePrompt || current.subtitle}`,
              imageBudget,
            );
            if (generated) {
              generatedCount++;
              return generated;
            }
            illustratedCount++;
            return editorialIllustration({
              name: plan.name,
              title: current.title,
              color,
              accent: accentColor,
            });
          },
        );
        if (cover) {
          covers[current.slug] = cover;
          coverAlts[current.slug] =
            importedCovers.has(current.slug) ? `Imagem importada da referência para ${current.title}.` : `Ilustração editorial gerada para ${current.title}; imagem ilustrativa.`;
        }
      }
    }),
  );
  if (plan.clone) return {logo, favicon, covers, coverAlts, demonstration:{vertical:"",rectangle:"",banner:"",sponsor:"",partner:""},warnings,generatedCount,illustratedCount};
  const demonstration = {
    vertical: await upload("Publicidade vertical demonstrativa FLUE", () =>
      demonstrationArt({
        name: plan.name,
        color,
        accent: accentColor,
        kind: "vertical",
      }),
    ),
    rectangle: await upload("Publicidade retangular demonstrativa FLUE", () =>
      demonstrationArt({
        name: plan.name,
        color,
        accent: accentColor,
        kind: "rectangle",
      }),
    ),
    banner: await upload("Publicidade demonstrativa FLUE", () =>
      demonstrationArt({
        name: plan.name,
        color,
        accent: accentColor,
        kind: "banner",
      }),
    ),
    sponsor: await upload("Patrocínio demonstrativo FLUE", () =>
      demonstrationArt({
        name: plan.name,
        color,
        accent: accentColor,
        kind: "sponsor",
      }),
    ),
    partner: await upload("Parceria demonstrativa FLUE", () =>
      demonstrationArt({
        name: plan.name,
        color,
        accent: accentColor,
        kind: "partner",
      }),
    ),
  };
  return {
    logo,
    favicon,
    covers,
    coverAlts,
    demonstration,
    warnings,
    generatedCount,
    illustratedCount,
  };
}
