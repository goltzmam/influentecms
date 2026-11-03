import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicPortal, publicData, portalBase } from "@/lib/public";
import { publicClient } from "@/lib/supabase/public";
import {
  NewsShell,
  Homepage,
  NewsArticle,
  NewsGrid,
} from "@/components/public-news";
import { cleanHtml } from "@/lib/content";
import type { Article } from "@/lib/types";
type Props = {
  params: Promise<{ slug: string; segments?: string[] }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};
export const dynamic = "force-dynamic";
async function loadArticle(portalId: string, slug: string) {
  const { data, error } = await publicClient()
    .from("articles")
    .select("*")
    .eq("portal_id", portalId)
    .eq("slug", slug)
    .in("status", ["published", "scheduled"])
    .lte("publish_at", new Date().toISOString())
    .single();
  if (error || !data) notFound();
  return data as Article;
}
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug, segments = [] } = await params;
  const p = await getPublicPortal(slug);
  const base = await portalBase(p);
  let title = p.settings.seoTitle || p.name,
    description = p.settings.seoDescription || p.settings.description || "",
    image = p.settings.ogImage || p.settings.logo;
  let canonical = base;
  const search = await searchParams;
  if (segments[0] === "noticia" && segments[1]) {
    const a = await loadArticle(p.id, segments[1]);
    title = a.seo_title || a.title;
    description = a.seo_description || a.subtitle;
    image = a.cover_url || image;
    canonical = `${base}/noticia/${a.slug}`;
  } else if (segments[0] === "categoria") {
    const { data } = await publicClient()
      .from("categories")
      .select("name")
      .eq("portal_id", p.id)
      .eq("slug", segments[1] || "")
      .single();
    if (data) title = `${data.name} | ${p.name}`;
    canonical = `${base}/categoria/${segments[1]}`;
  } else if (segments[0] === "pagina") {
    const { data } = await publicClient()
      .from("pages")
      .select("title")
      .eq("portal_id", p.id)
      .eq("slug", segments[1] || "")
      .eq("published", true)
      .single();
    if (data) title = `${data.title} | ${p.name}`;
    canonical = `${base}/pagina/${segments[1]}`;
  }
  if (search.page && Number(search.page) > 1)
    canonical += `?page=${Math.floor(Number(search.page))}`;
  return {
    title,
    description,
    robots:
      segments[0] === "busca"
        ? { index: false, follow: true }
        : { index: true, follow: true },
    alternates: {
      canonical,
      types: { "application/rss+xml": `${base}/rss.xml` },
    },
    icons: p.settings.favicon ? { icon: p.settings.favicon } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: p.name,
      locale: "pt_BR",
      type: segments[0] === "noticia" ? "article" : "website",
      images: image ? [image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}
export default async function PublicPage({ params, searchParams }: Props) {
  const { slug, segments = [] } = await params;
  const q = await searchParams;
  const portal = await getPublicPortal(slug);
  const data = await publicData(portal);
  const basePath = (await headers()).get("x-portal-host") ? "" : `/p/${slug}`;
  let body: React.ReactNode;
  if (!segments.length) {
    const ids = portal.home_published
      .flatMap((s) => s.articleIds || [])
      .filter((id) => !data.articles.some((a) => a.id === id));
    if (ids.length) {
      const { data: extra, error } = await publicClient()
        .from("articles")
        .select("*")
        .eq("portal_id", portal.id)
        .in("id", ids)
        .in("status", ["published", "scheduled"])
        .lte("publish_at", new Date().toISOString());
      if (error) throw new Error("Não foi possível carregar os destaques.");
      data.articles.push(...(extra as Article[]));
    }
    body = <Homepage portal={portal} {...data} basePath={basePath} />;
  } else if (segments.length === 2 && segments[0] === "noticia") {
    const article = await loadArticle(portal.id, segments[1]);
    const base = await portalBase(portal);
    const structured = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.subtitle,
      datePublished: article.publish_at,
      dateModified: article.updated_at,
      author: { "@type": "Person", name: article.author },
      publisher: {
        "@type": "Organization",
        name: portal.name,
        ...(portal.settings.logo
          ? { logo: { "@type": "ImageObject", url: portal.settings.logo } }
          : {}),
      },
      mainEntityOfPage: `${base}/noticia/${article.slug}`,
      ...(article.cover_url ? { image: [article.cover_url] } : {}),
    };
    body = (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
          }}
        />
        <NewsArticle
          article={article}
          category={data.categories.find((c) => c.id === article.category_id)}
          campaigns={data.campaigns}
        />
        <section className="homepage-section">
          <h2>Leia também</h2>
          <NewsGrid
            articles={data.articles
              .filter((a) => a.id !== article.id)
              .slice(0, 3)}
            categories={data.categories}
            basePath={basePath}
          />
        </section>
      </>
    );
  } else if (segments.length === 2 && segments[0] === "pagina") {
    const { data: page, error } = await publicClient()
      .from("pages")
      .select("title,content")
      .eq("portal_id", portal.id)
      .eq("slug", segments[1])
      .eq("published", true)
      .single();
    if (error || !page) notFound();
    body = (
      <article className="public-article institutional">
        <h1>{page.title}</h1>
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: cleanHtml(page.content) }}
        />
      </article>
    );
  } else if (
    (segments.length === 2 && segments[0] === "categoria") ||
    (segments.length === 1 && segments[0] === "busca")
  ) {
    const category =
      segments[0] === "categoria"
        ? data.categories.find((c) => c.slug === segments[1])
        : null;
    if (segments[0] === "categoria" && !category) notFound();
    const page = Math.min(2000, Math.max(1, Math.floor(Number(q.page) || 1)));
    const search = (q.q || "").slice(0, 200);
    let req = publicClient()
      .from("articles")
      .select("*", { count: "exact" })
      .eq("portal_id", portal.id)
      .in("status", ["published", "scheduled"])
      .lte("publish_at", new Date().toISOString())
      .order("publish_at", { ascending: false })
      .range((page - 1) * 18, page * 18 - 1);
    if (category) req = req.eq("category_id", category.id);
    else req = req.ilike("title", `%${search.replace(/[%_]/g, "")}%`);
    const { data: articles, error, count } = await req;
    if (error) throw new Error("Busca indisponível.");
    const qs = new URLSearchParams(category ? {} : { q: search });
    body = (
      <>
        <div className="public-section-heading">
          <span className="news-kicker">
            {category ? "EDITORIA" : "ENCONTRE SUA PRÓXIMA LEITURA"}
          </span>
          <h1>{category ? category.name : `Busca: ${search}`}</h1>
          <p>{count || 0} notícias</p>
        </div>
        {articles?.length ? (
          <NewsGrid
            articles={articles as Article[]}
            categories={data.categories}
            basePath={basePath}
          />
        ) : (
          <div className="public-empty">Nenhuma notícia encontrada.</div>
        )}
        <nav className="pagination">
          {page > 1 && (
            <Link
              href={`?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page - 1) })}`}
            >
              ← Anterior
            </Link>
          )}
          <span>Página {page}</span>
          {count && count > page * 18 ? (
            <Link
              href={`?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page + 1) })}`}
            >
              Próxima →
            </Link>
          ) : null}
        </nav>
      </>
    );
  } else notFound();
  return (
    <NewsShell portal={portal} {...data} basePath={basePath}>
      {body}
    </NewsShell>
  );
}
