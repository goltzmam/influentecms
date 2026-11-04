"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortal } from "@/lib/portal";
import { brandImage } from "@/lib/ai/brand-renderer";
import { presentationSettings } from "@/lib/presentation";
export async function refreshBrandArtwork(form: FormData) {
  const { client, portal } = await requirePortal(String(form.get("portal_id")));
  let count = 0;
  const palette = presentationSettings(portal.settings, portal.template);
  const color = /^#[0-9a-f]{6}$/i.test(palette.color || "")
      ? palette.color!
      : "#285c45",
    accent = /^#[0-9a-f]{6}$/i.test(palette.accentColor || "")
      ? palette.accentColor!
      : "#d5eea1";
  let settings = { ...portal.settings };
  const [assets, articles] = await Promise.all([
    client
      .from("media")
      .select("id,name,url")
      .eq("portal_id", portal.id)
      .order("created_at", { ascending: false }),
    client
      .from("articles")
      .select("id,title,cover_url")
      .eq("portal_id", portal.id),
  ]);
  if (!assets.error && !articles.error)
    for (const asset of (assets.data || [])
      .filter(
        (row) =>
          row.name === "Logotipo tipográfico gerado" ||
          row.name === "Ícone de marca gerado" ||
          row.name.startsWith("Ilustração de marca:"),
      )
      .slice(0, 40)) {
      const article = (articles.data || []).find(
        (row) => row.cover_url === asset.url,
      );
      const kind =
        settings.logo === asset.url
          ? "logo"
          : settings.favicon === asset.url
            ? "favicon"
            : article
              ? "cover"
              : null;
      if (!kind) continue;
      let path = "",
        mediaId = "";
      try {
        const bytes = await brandImage({
          name: portal.name,
          title: article?.title,
          color,
          accent,
          kind,
        });
        path = `${portal.organization_id}/${portal.id}/${crypto.randomUUID()}.webp`;
        const uploaded = await client.storage
          .from("portal-media")
          .upload(path, bytes, { contentType: "image/webp", upsert: false });
        if (uploaded.error) throw uploaded.error;
        const url = client.storage.from("portal-media").getPublicUrl(path)
          .data.publicUrl;
        const media = await client
          .from("media")
          .insert({
            organization_id: portal.organization_id,
            portal_id: portal.id,
            name: asset.name,
            path,
            url,
            size: bytes.length,
          })
          .select("id")
          .single();
        if (media.error) throw media.error;
        mediaId = media.data.id;
        if (kind === "cover") {
          const result = await client
            .from("articles")
            .update({ cover_url: url })
            .eq("portal_id", portal.id)
            .eq("cover_url", asset.url);
          if (result.error) throw result.error;
        } else {
          const next = {
            ...settings,
            [kind === "logo" ? "logo" : "favicon"]: url,
            ...(settings.ogImage === asset.url ? { ogImage: url } : {}),
          };
          const result = await client
            .from("portals")
            .update({ settings: next })
            .eq("id", portal.id);
          if (result.error) throw result.error;
          settings = next;
        }
        count++;
      } catch {
        if (mediaId)
          await client
            .from("media")
            .delete()
            .eq("id", mediaId)
            .eq("portal_id", portal.id);
        if (path) await client.storage.from("portal-media").remove([path]);
      }
    }
  revalidatePath("/", "layout");
  redirect(
    `/painel/${portal.id}/midia?notice=${encodeURIComponent(count ? `${count} artes de marca atualizadas. Suas imagens enviadas foram preservadas.` : "Nenhuma arte de marca foi atualizada. Envie suas imagens ou tente novamente.")}`,
  );
}
