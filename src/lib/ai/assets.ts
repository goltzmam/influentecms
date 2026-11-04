import "server-only";
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
  const { color, accentColor, surfaceColor } = plan.identity;
  async function upload(name: string, render: () => Promise<Buffer>) {
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
  const logo = await upload("Logotipo tipográfico gerado", () =>
    brandImage({ name: plan.name, color, accent: accentColor, kind: "logo" }),
  );
  const favicon = await upload("Ícone de marca gerado", () =>
    brandImage({
      name: plan.name,
      color,
      accent: accentColor,
      kind: "favicon",
    }),
  );
  const covers: Record<string, string> = {};
  for (const article of plan.articles) {
    const cover = await upload(`Ilustração de marca: ${article.title}`, () =>
      brandImage({
        name: plan.name,
        title: article.title,
        color,
        accent: accentColor,
        kind: "cover",
      }),
    );
    if (cover) covers[article.slug] = cover;
  }
  return { logo, favicon, covers, warnings };
}
