import { publicClient } from "@/lib/supabase/public";
import { escapeXml } from "@/lib/content";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await publicClient().from("portals").select("slug");
  if (error) return new Response("Indisponível", { status: 503 });
  const base = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${data.map((p) => `<sitemap><loc>${escapeXml(`${base}/p/${p.slug}/sitemap.xml`)}</loc></sitemap>`).join("")}</sitemapindex>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
