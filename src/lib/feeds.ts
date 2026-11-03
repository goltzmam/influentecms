import { escapeXml } from "./content";
import type { Article, Portal } from "./types";
export function rss(portal: Portal, articles: Article[], base: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeXml(portal.name)}</title><link>${escapeXml(base)}</link><description>${escapeXml(portal.settings.description || portal.name)}</description><language>pt-BR</language>${[
    ...articles,
  ]
    .sort(
      (a, b) => Date.parse(b.publish_at || "") - Date.parse(a.publish_at || ""),
    )
    .slice(0, 50)
    .map(
      (a) =>
        `<item><title>${escapeXml(a.title)}</title><link>${escapeXml(`${base}/noticia/${a.slug}`)}</link><guid isPermaLink="true">${escapeXml(`${base}/noticia/${a.slug}`)}</guid><description>${escapeXml(a.subtitle)}</description><pubDate>${new Date(a.publish_at!).toUTCString()}</pubDate></item>`,
    )
    .join("")}</channel></rss>`;
}
export function sitemap(
  portal: Portal,
  articles: Article[],
  base: string,
  news = false,
) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${news ? "" : `<url><loc>${escapeXml(base)}</loc></url>`}${articles
    .filter(
      (a) =>
        !news ||
        (a.publish_at && Date.parse(a.publish_at) >= Date.now() - 172800000),
    )
    .slice(0, news ? 1000 : 49999)
    .map(
      (a) =>
        `<url><loc>${escapeXml(`${base}/noticia/${a.slug}`)}</loc>${news ? `<news:news><news:publication><news:name>${escapeXml(portal.name)}</news:name><news:language>pt</news:language></news:publication><news:publication_date>${a.publish_at}</news:publication_date><news:title>${escapeXml(a.title)}</news:title></news:news>` : `<lastmod>${a.updated_at}</lastmod>`}</url>`,
    )
    .join("")}</urlset>`;
}
