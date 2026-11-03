import { getPublicPortal, portalBase } from "@/lib/public";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const portal = await getPublicPortal(slug);
  const base = await portalBase(portal);
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /painel\nDisallow: /login\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/news-sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
