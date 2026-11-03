import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { publicClient } from "./supabase/public";
import type { Portal, Article, Category, Campaign, Partner } from "./types";
export async function getPublicPortal(slug: string) {
  const client = publicClient();
  const { data, error } = await client
    .from("portals")
    .select("id,name,slug,template,settings,home_published,created_at")
    .eq("slug", slug)
    .single();
  if (error || !data) notFound();
  return data as Portal;
}
export async function publicData(portal: Portal) {
  const client = publicClient();
  const results = await Promise.all([
    client
      .from("articles")
      .select("*")
      .eq("portal_id", portal.id)
      .in("status", ["published", "scheduled"])
      .lte("publish_at", new Date().toISOString())
      .order("publish_at", { ascending: false })
      .limit(100),
    client
      .from("categories")
      .select("id,name,slug")
      .eq("portal_id", portal.id)
      .order("name"),
    client
      .from("campaigns")
      .select("*")
      .eq("portal_id", portal.id)
      .eq("active", true),
    client
      .from("partners")
      .select("*")
      .eq("portal_id", portal.id)
      .eq("active", true),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Falha ao carregar o portal.");
  const now = Date.now();
  return {
    articles: results[0].data as Article[],
    categories: results[1].data as Category[],
    campaigns: (results[2].data as Campaign[]).filter(
      (c) =>
        (!c.starts_at || Date.parse(c.starts_at) <= now) &&
        (!c.ends_at || Date.parse(c.ends_at) > now),
    ),
    partners: results[3].data as Partner[],
  };
}
export async function portalBase(portal: Portal) {
  const { data, error } = await publicClient()
    .from("domains")
    .select("hostname")
    .eq("portal_id", portal.id)
    .eq("verified", true)
    .order("created_at")
    .limit(1);
  if (error) throw new Error("Não foi possível resolver o endereço canônico.");
  if (data?.[0]) return `https://${data[0].hostname}`;
  if (process.env.PORTAL_BASE_DOMAIN)
    return `https://${portal.slug}.${process.env.PORTAL_BASE_DOMAIN}`;
  const host = (await headers()).get("x-portal-host");
  if (host) return `https://${host}`;
  const base = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/p/${portal.slug}`;
}
export async function publicArticlesAll(portalId: string) {
  const client = publicClient();
  const rows: Article[] = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("portal_id", portalId)
      .in("status", ["published", "scheduled"])
      .lte("publish_at", new Date().toISOString())
      .order("id")
      .range(offset, offset + 999);
    if (error) throw new Error("Falha na consulta editorial.");
    rows.push(...(data as Article[]));
    if (data.length < 1000) break;
  }
  return rows;
}
