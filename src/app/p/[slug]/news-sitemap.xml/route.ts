import { getPublicPortal, publicArticlesAll, portalBase } from "@/lib/public";
import { rss, sitemap } from "@/lib/feeds";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const portal = await getPublicPortal(slug);
  const articles = await publicArticlesAll(portal.id);
  const base = await portalBase(portal);
  return new Response(sitemap(portal, articles, base, true), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
