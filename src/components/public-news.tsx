import type { Article, Category, Campaign } from "@/lib/types";
import { cleanHtml } from "@/lib/content";
import { NewsImage, Campaigns } from "./public-template";
export {
  NewsShell,
  Homepage,
  NewsGrid,
  Campaigns,
  NewsImage,
} from "./public-template";
export function NewsArticle({
  article,
  category,
  campaigns,
}: {
  article: Article;
  category?: Category;
  campaigns: Campaign[];
}) {
  return (
    <div className="article-layout">
      <article className="public-article">
        {category && <span className="news-kicker">{category.name}</span>}
        <h1>{article.title}</h1>
        <p className="article-subtitle">{article.subtitle}</p>
        <div className="article-byline">
          Por <strong>{article.author}</strong>
          {article.publish_at && (
            <time dateTime={article.publish_at}>
              {new Date(article.publish_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </time>
          )}
        </div>
        {article.cover_url && (
          <figure>
            <NewsImage
              src={article.cover_url}
              alt={article.cover_alt}
              priority
            />
            {article.cover_alt && <figcaption>{article.cover_alt}</figcaption>}
          </figure>
        )}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: cleanHtml(article.content) }}
        />
        {article.tags.length > 0 && (
          <div className="article-tags">
            {article.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </article>
      <aside className="article-aside">
        <Campaigns campaigns={campaigns} position="sidebar" />
      </aside>
    </div>
  );
}
