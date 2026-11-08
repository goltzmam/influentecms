import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiBlueprint } from "./schema";
import type { Section, Settings } from "../types";
import { createBrandAssets } from "./assets";
export async function completeAiPresentation(
  client: SupabaseClient,
  organizationId: string,
  portalId: string,
  plan: AiBlueprint,
) {
  const assets = await createBrandAssets(
      client,
      organizationId,
      portalId,
      plan,
    ),
    warnings = [...assets.warnings];
  const existing = await client
    .from("portals")
    .select("settings,home_published,slug")
    .eq("id", portalId)
    .eq("organization_id", organizationId)
    .single();
  if (existing.error)
    throw new Error("Não foi possível abrir a composição do portal.");
  const draft = await client.rpc("get_home_draft", { target: portalId });
  if (draft.error) throw draft.error;
  const settings = existing.data.settings as Settings;
  if (plan.clone) {
    const result = await client.from("portals").update({settings:{...settings,logo:settings.logo||assets.logo,favicon:settings.favicon||assets.favicon,ogImage:settings.ogImage||Object.values(assets.covers)[0]||assets.logo}}).eq("id",portalId).eq("organization_id",organizationId);
    if(result.error) throw result.error;
    let ready=true;
    for(const [slug,cover_url] of Object.entries(assets.covers)) {
      const saved=await client.from("articles").update({cover_url,cover_alt:assets.coverAlts[slug]}).eq("portal_id",portalId).eq("slug",slug).eq("cover_url","");
      if(saved.error)ready=false;
    }
    return {warnings,ready:ready&&!!assets.logo&&!!assets.favicon&&Object.keys(assets.covers).length===plan.articles.length,generatedImages:assets.generatedCount,illustrations:assets.illustratedCount};
  }
  const known = await client
    .from("campaigns")
    .select("id,name,creative")
    .eq("portal_id", portalId)
    .contains("creative", { source: "flue", demo: true });
  if (known.error) throw known.error;
  const ids: Record<string, string> = {};
  for (const [format, name, image] of [
    ["leaderboard", "Publicidade demonstrativa", assets.demonstration.banner],
    [
      "skyscraper",
      "Publicidade vertical demonstrativa",
      assets.demonstration.vertical,
    ],
    [
      "rectangle",
      "Publicidade retangular demonstrativa",
      assets.demonstration.rectangle,
    ],
    ["sponsor", "Patrocínio demonstrativo", assets.demonstration.sponsor],
  ]) {
    if (!image) continue;
    const item = known.data?.find((c) => c.name === name);
    if (item) {
      ids[format] = item.id;
      continue;
    }
    const result = await client
      .from("campaigns")
      .insert({
        organization_id: organizationId,
        portal_id: portalId,
        name,
        image_url: image,
        link: `${(process.env.APP_URL || "https://influentecms.vercel.app").replace(/\/$/, "")}/p/${existing.data.slug}/pagina/${plan.pages.find((p) => /contato|contact/.test(p.slug))?.slug || plan.pages[0].slug}`,
        position: "inline",
        active: true,
        creative: {
          demo: true,
          source: "flue",
          mediaType: "image",
          format: format === "sponsor" ? "custom" : format,
          width: format === "sponsor" ? 240 : undefined,
          height: format === "sponsor" ? 90 : undefined,
          fit: "cover",
          alt: "Peça demonstrativa gerada. Substitua pela imagem do seu anunciante.",
        },
      })
      .select("id")
      .single();
    if (result.error) {
      warnings.push("Uma peça demonstrativa não pôde ser salva.");
      continue;
    }
    ids[format] = result.data.id;
  }
  const partner = await client
    .from("partners")
    .select("id")
    .eq("portal_id", portalId)
    .contains("creative", { demo: true, source: "flue" })
    .limit(1);
  let partnerReady = !partner.error && !!partner.data?.length;
  if (!partner.error && !partner.data?.length && assets.demonstration.partner) {
    const result = await client.from("partners").insert({
      organization_id: organizationId,
      portal_id: portalId,
      name: "Sua próxima parceria",
      image_url: assets.demonstration.partner,
      link: "",
      active: true,
      creative: {
        demo: true,
        source: "flue",
        mediaType: "image",
        description:
          "Espaço demonstrativo. Adicione aqui uma marca parceira do seu portal.",
        fit: "cover",
      },
    });
    partnerReady = !result.error;
    if (result.error)
      warnings.push("A parceria demonstrativa não pôde ser salva.");
  }
  const fill = (section: Section): Section => ({
    ...section,
    adSlots: section.adSlots?.map((slot) => ({
      ...slot,
      showEmpty: slot.kind === "google" ? true : slot.showEmpty,
      demo: slot.kind === "google" && !slot.googleSlot ? true : slot.demo,
      ...(!slot.campaignId && slot.kind !== "google"
        ? {
            campaignId:
              ids[
                slot.kind === "sponsor"
                  ? "sponsor"
                  : slot.format === "skyscraper"
                    ? "skyscraper"
                    : slot.format === "rectangle" || slot.format === "square"
                      ? "rectangle"
                      : "leaderboard"
              ] || "",
          }
        : {}),
    })),
  });
  const firstCover = Object.values(assets.covers)[0];
  const update = await client
    .from("portals")
    .update({
      settings: {
        ...settings,
        logo: settings.logo || assets.logo,
        favicon: settings.favicon || assets.favicon,
        ogImage: settings.ogImage || firstCover || assets.logo,
        socialCards: settings.socialCards?.length
          ? settings.socialCards
          : firstCover
            ? [
                {
                  label: "Conteúdo e novidades",
                  image: firstCover,
                  url: `${(process.env.APP_URL || "https://influentecms.vercel.app").replace(/\/$/, "")}/p/${existing.data.slug}/pagina/${plan.pages.find((p) => /sobre|about/.test(p.slug))?.slug || plan.pages[0].slug}`,
                },
                {
                  label: "Nossa comunidade",
                  image: Object.values(assets.covers)[1] || firstCover,
                  url: `${(process.env.APP_URL || "https://influentecms.vercel.app").replace(/\/$/, "")}/p/${existing.data.slug}/pagina/${plan.pages.find((p) => /contato|contact/.test(p.slug))?.slug || plan.pages[0].slug}`,
                },
              ]
            : [],
        experience: {
          ...settings.experience,
          partners: {
            title: "Marcas e parcerias",
            ...settings.experience?.partners,
          },
        },
      },
      home_draft: ((draft.data || []) as Section[]).map(fill),
      home_published: (existing.data.home_published as Section[]).map(fill),
    })
    .eq("id", portalId)
    .eq("organization_id", organizationId);
  if (update.error) throw update.error;
  let coversReady = true;
  for (const [slug, cover_url] of Object.entries(assets.covers)) {
    const result = await client
      .from("articles")
      .update({ cover_url, cover_alt: assets.coverAlts[slug] })
      .eq("portal_id", portalId)
      .eq("slug", slug)
      .eq("cover_url", "");
    if (result.error) {
      coversReady = false;
      warnings.push("Uma capa deve ser selecionada pela biblioteca.");
    }
  }
  return {
    warnings,
    ready:
      partnerReady &&
      coversReady &&
      !!assets.logo &&
      !!assets.favicon &&
      Object.keys(assets.covers).length === plan.articles.length &&
      Object.keys(ids).length === 4,
    generatedImages: assets.generatedCount,
    illustrations: assets.illustratedCount,
  };
}
