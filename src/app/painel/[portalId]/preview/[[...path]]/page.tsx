import { campaignMatches } from "@/lib/experience";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePortal } from "@/lib/portal";
import { NewsShell, Homepage, NewsArticle } from "@/components/public-news";
import type {
  Article,
  Category,
  Campaign,
  Partner,
  Section,
} from "@/lib/types";
export const metadata: Metadata = {
  title: "Pré-visualização privada",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
}: {
  params: Promise<{ portalId: string; path?: string[] }>;
}) {
  const { portalId, path = [] } = await params;
  const { client, portal } = await requirePortal(portalId);
  const draftDesign = await client.rpc("get_home_design", { target: portalId });
  if (draftDesign.error)
    throw new Error("Não foi possível carregar o visual salvo.");
  if (draftDesign.data) {
    portal.settings = { ...portal.settings, ...draftDesign.data.settings };
    portal.template = draftDesign.data.template || portal.template;
  }
  const [a, c, b, p, d] = await Promise.all([
    client
      .from("articles")
      .select("*")
      .eq("portal_id", portalId)
      .order("updated_at", { ascending: false })
      .limit(200),
    client.from("categories").select("id,name,slug").eq("portal_id", portalId),
    client
      .from("campaigns")
      .select("*")
      .eq("portal_id", portalId)
      .eq("active", true),
    client
      .from("partners")
      .select("*")
      .eq("portal_id", portalId)
      .eq("active", true),
    client.rpc("get_home_draft", { target: portalId }),
  ]);
  if ([a, c, b, p, d].some((v) => v.error))
    throw new Error("Não foi possível carregar a prévia.");
  const articles = a.data as Article[],
    categories = c.data as Category[],
    campaigns = (b.data as Campaign[]).filter(
      (v) =>
        (!v.starts_at || Date.parse(v.starts_at) <= Date.now()) &&
        (!v.ends_at || Date.parse(v.ends_at) > Date.now()),
    ),
    partners = p.data as Partner[],
    basePath = `/p/${portal.slug}`;
  let article: Article | undefined;
  if (path[0] === "noticia" && path[1]) {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("portal_id", portalId)
      .eq("id", path[1])
      .single();
    if (error || !data) notFound();
    article = data as Article;
  } else if (path.length) notFound();
  const visibleCampaigns = campaigns.filter((campaign) =>
    campaignMatches(campaign.creative, {
      kind: article ? "article" : "home",
      slug: article?.slug,
      categoryId: article?.category_id || undefined,
    }),
  );
  return (
    <NewsShell
      portal={portal}
      categories={categories}
      campaigns={visibleCampaigns}
      partners={partners}
      basePath={basePath}
      preview
      isHomepage={!article}
    >
      {article ? (
        <NewsArticle
          article={article}
          category={categories.find((c) => c.id === article.category_id)}
          campaigns={visibleCampaigns}
        />
      ) : (
        <Homepage
          preview
          portal={portal}
          articles={articles}
          categories={categories}
          campaigns={visibleCampaigns}
          basePath={basePath}
          sections={d.data as Section[]}
        />
      )}
    </NewsShell>
  );
}
