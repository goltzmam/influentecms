import { getPublicPortal, publicArticlesAll, portalBase } from "@/lib/public";
import { publicClient } from "@/lib/supabase/public";
import { sitemap } from "@/lib/feeds";
import { escapeXml } from "@/lib/content";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const portal = await getPublicPortal(slug);
  const articles = await publicArticlesAll(portal.id);
  const base = await portalBase(portal);
  const [pages, categories] = await Promise.all([
    publicClient()
      .from("pages")
      .select("slug")
      .eq("portal_id", portal.id)
      .eq("published", true),
    publicClient().from("categories").select("slug").eq("portal_id", portal.id),
  ]);
  if (pages.error || categories.error)
    return new Response("Indisponível", { status: 503 });
  const extra = [
    ...(pages.data || []).map((p) => `${base}/pagina/${p.slug}`),
    ...(categories.data || []).map((c) => `${base}/categoria/${c.slug}`),
  ]
    .map((url) => `<url><loc>${escapeXml(url)}</loc></url>`)
    .join("");
  return new Response(
    sitemap(portal, articles, base).replace("</urlset>", `${extra}</urlset>`),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
