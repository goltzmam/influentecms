import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Globe,
  MessageCircle,
} from "lucide-react";
import type {
  Portal,
  Article,
  Category,
  Campaign,
  Partner,
  Section,
} from "@/lib/types";
import { safeLink } from "@/lib/links";
import {
  presentationSettings,
  referenceSections,
  youtubeEmbed,
} from "@/lib/presentation";
import { LeadCarousel } from "./lead-carousel";
import { ContactForm, NewsletterForm } from "./reader-forms";
function siteLink(url: string, basePath: string) {
  const safe = safeLink(url);
  return /^\/(?:$|noticia(?:\/|$)|categoria(?:\/|$)|pagina(?:\/|$)|busca(?:\?|$)|rss\.xml$)/.test(
    safe,
  )
    ? `${basePath}${safe === "/" ? "" : safe}` || "/"
    : safe;
}
export function NewsImage({
  src,
  alt = "",
  priority = false,
}: {
  src: string;
  alt?: string;
  priority?: boolean;
}) {
  if (!src || safeLink(src) === "#") return null;
  let optimize = false;
  try {
    optimize =
      new URL(src).protocol === "https:" &&
      new URL(src).host ===
        new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.local")
          .host;
  } catch {}
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      priority={priority}
      unoptimized={!optimize}
      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
    />
  );
}

function SocialIcon({ label }: { label: string }) {
  const name = label.toLowerCase();
  const Icon = name.includes("instagram")
    ? Instagram
    : name.includes("facebook")
      ? Facebook
      : name.includes("youtube")
        ? Youtube
        : name.includes("linkedin")
          ? Linkedin
          : name.includes("whatsapp")
            ? MessageCircle
            : Globe;
  return <Icon size={19} aria-hidden="true" />;
}
export function NewsShell({
  portal,
  categories,
  campaigns,
  partners,
  basePath,
  children,
  preview = false,
}: {
  portal: Portal;
  categories: Category[];
  campaigns: Campaign[];
  partners: Partner[];
  basePath: string;
  children: React.ReactNode;
  preview?: boolean;
}) {
  const s = presentationSettings(portal.settings, portal.template);
  const palette = (value: string | undefined, fallback: string) =>
    /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
  const links =
    s.menusMode === "custom"
      ? s.menus || []
      : [
          { label: "Início", url: basePath || "/" },
          ...categories.map((c) => ({
            label: c.name,
            url: `${basePath}/categoria/${c.slug}`,
          })),
          ...(s.menus || []),
        ];
  return (
    <div
      className={`news-site reference-site ${portal.template}`}
      style={
        {
          "--portal-color": palette(s.color, "#6324dc"),
          "--portal-accent": palette(s.accentColor, "#d5ff00"),
          "--portal-surface": palette(s.surfaceColor, "#ffffff"),
          "--portal-ink": palette(s.textColor, "#21152e"),
          "--portal-font":
            s.font === "serif" ? "Georgia, serif" : "Arial, sans-serif",
        } as CSSProperties
      }
    >
      {preview && (
        <div className="preview-ribbon">
          PRÉ-VISUALIZAÇÃO PRIVADA · Conteúdo não publicado
        </div>
      )}
      <header className="reference-header">
        <div className="news-masthead">
          <div className="brand-column">
            <Link className="news-logo" href={basePath || "/"}>
              {s.logo ? (
                <img src={safeLink(s.logo)} alt={portal.name} />
              ) : (
                <span>{portal.name}</span>
              )}
            </Link>
            {s.tagline && <p className="brand-tagline">{s.tagline}</p>}
          </div>
          <nav className="news-nav" aria-label="Navegação do portal">
            {links.map((l, i) => (
              <Link key={i} href={siteLink(l.url, basePath)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            {preview ? (
              <div className="public-search">
                <input
                  aria-label="Buscar notícias"
                  placeholder={`Encontre no ${portal.name}`}
                  disabled
                />
                <button type="button" disabled>
                  Buscar
                </button>
              </div>
            ) : (
              <form className="public-search" action={`${basePath}/busca`}>
                <input
                  aria-label="Buscar notícias"
                  type="search"
                  name="q"
                  placeholder={`Encontre no ${portal.name}`}
                  required
                />
                <button>Buscar</button>
              </form>
            )}
            {s.whatsappUrl && (
              <a
                className="header-whatsapp"
                href={safeLink(s.whatsappUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                <span>{s.whatsappText}</span>
              </a>
            )}
          </div>
        </div>
        {s.header && <p className="header-editorial-note">{s.header}</p>}
      </header>
      <main className="news-container">
        <Campaigns campaigns={campaigns} position="header" />
        {children}
        <Campaigns campaigns={campaigns} position="footer" />
        {partners.length > 0 && (
          <section className="public-partners">
            <h2>Parceiros</h2>
            <div>
              {partners.map((p) => (
                <a
                  key={p.id}
                  href={safeLink(p.link)}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  <img src={safeLink(p.image_url)} alt={p.name} />
                </a>
              ))}
            </div>
          </section>
        )}
        {(s.socialCards?.some((c) => c.image) || s.contactEnabled) && (
          <section className="community-section">
            <div className="community-cards">
              {s.socialCards
                ?.filter((c) => c.image)
                .map((c, i) => (
                  <a
                    key={i}
                    href={safeLink(c.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h2>
                      <SocialIcon label={c.label} />
                      {c.label}
                    </h2>
                    <img src={safeLink(c.image)} alt={c.label} />
                  </a>
                ))}
            </div>
            {s.contactEnabled && (
              <ContactForm
                portalId={portal.id}
                title={s.contactTitle || "Fale com a redação"}
                privacyUrl={
                  s.privacyUrl ? siteLink(s.privacyUrl, basePath) : undefined
                }
                preview={preview}
              />
            )}
          </section>
        )}
      </main>
      {(s.newsletterEnabled || s.whatsappUrl) && (
        <section className="news-newsletter">
          <div>
            {s.newsletterEnabled && (
              <NewsletterForm
                portalId={portal.id}
                title={s.newsletterTitle || "Receba novidades por e-mail"}
                preview={preview}
              />
            )}
            {s.whatsappUrl && (
              <div className="newsletter-whatsapp">
                <h2>{s.newsletterText}</h2>
                <a
                  href={safeLink(s.whatsappUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={19} />
                  {s.whatsappText}
                </a>
              </div>
            )}
          </div>
        </section>
      )}
      <footer className="news-footer">
        <div className="footer-columns">
          <section>
            <Link className="news-logo" href={basePath || "/"}>
              {s.logo ? (
                <img src={safeLink(s.logo)} alt={portal.name} />
              ) : (
                <span>{portal.name}</span>
              )}
            </Link>
            <p>{s.tagline}</p>
            {s.contactPhone && (
              <a href={`tel:${s.contactPhone.replace(/[^+0-9]/g, "")}`}>
                {s.contactPhone}
              </a>
            )}
            {s.contactEmail && (
              <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
            )}
          </section>
          <nav aria-label="Navegação do rodapé">
            {links.map((l, i) => (
              <Link key={i} href={siteLink(l.url, basePath)}>
                {l.label}
              </Link>
            ))}
            <Link href={`${basePath}/rss.xml`}>RSS</Link>
          </nav>
          <section className="footer-commercial">
            <p>{s.commercialText}</p>
            {s.commercialPhone && (
              <a href={`tel:${s.commercialPhone.replace(/[^+0-9]/g, "")}`}>
                {s.commercialPhone}
              </a>
            )}
            {s.commercialEmail && (
              <a href={`mailto:${s.commercialEmail}`}>{s.commercialEmail}</a>
            )}
          </section>
          <section className="footer-social">
            <p>Acompanhe o {portal.name} nas redes</p>
            <div>
              {s.socials?.map((l, i) => (
                <a
                  key={i}
                  href={safeLink(l.url)}
                  aria-label={l.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon label={l.label} />
                </a>
              ))}
            </div>
          </section>
        </div>
        {s.footer && <p className="footer-note">{s.footer}</p>}
        <small>
          © {new Date().getFullYear()} {portal.name} · Todos os direitos
          reservados.
        </small>
      </footer>
    </div>
  );
}
export function Campaigns({
  campaigns,
  position,
}: {
  campaigns: Campaign[];
  position: string;
}) {
  return (
    <>
      {campaigns
        .filter((c) => c.position === position)
        .map((c) => (
          <aside className={`public-ad ad-${position}`} key={c.id}>
            <span>Publicidade</span>
            <a
              href={safeLink(c.link)}
              target="_blank"
              rel="sponsored noopener noreferrer"
            >
              <img src={safeLink(c.image_url)} alt={c.name} />
            </a>
          </aside>
        ))}
    </>
  );
}
function CategoryLabel({
  article,
  categories,
}: {
  article: Article;
  categories: Category[];
}) {
  const c = categories.find((c) => c.id === article.category_id);
  return c ? <span className="news-kicker">{c.name}</span> : null;
}
function ArticleCard({
  article,
  categories,
  basePath,
  variant = "standard",
  showImage = true,
}: {
  article: Article;
  categories: Category[];
  basePath: string;
  variant?: string;
  showImage?: boolean;
}) {
  return (
    <article className={`news-card ${variant}`}>
      {showImage && article.cover_url && (
        <Link
          href={`${basePath}/noticia/${article.slug}`}
          className="card-image"
          tabIndex={-1}
          aria-hidden="true"
        >
          <NewsImage src={article.cover_url} alt={article.cover_alt} />
        </Link>
      )}
      <div className="card-copy">
        <CategoryLabel article={article} categories={categories} />
        <Link href={`${basePath}/noticia/${article.slug}`}>
          <h2>{article.title}</h2>
        </Link>
        {variant === "digest-lead" && <p>{article.subtitle}</p>}
        <small>
          {article.publish_at &&
            `${new Date(article.publish_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} · `}
          {article.author}
        </small>
      </div>
    </article>
  );
}
export function NewsGrid({
  articles,
  categories,
  basePath,
  hero = false,
}: {
  articles: Article[];
  categories: Category[];
  basePath: string;
  hero?: boolean;
}) {
  return (
    <div className={`news-grid ${hero ? "lead-grid" : ""}`}>
      {articles.map((a) => (
        <ArticleCard
          key={a.id}
          article={a}
          categories={categories}
          basePath={basePath}
        />
      ))}
    </div>
  );
}
function VideoRail({
  portal,
  campaigns,
}: {
  portal: Portal;
  campaigns: Campaign[];
}) {
  const s = portal.settings;
  const embed = youtubeEmbed(s.videoUrl || "");
  return (
    <aside className="frontpage-rail">
      {embed && (
        <section className="reference-video">
          {s.videoTitle && <h2>{s.videoTitle}</h2>}
          <iframe
            title={s.videoTitle || "Vídeo em destaque"}
            src={embed}
            loading="lazy"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <div className="video-links">
            <span aria-hidden="true">●</span>
            {s.videosLink && <a href={safeLink(s.videosLink)}>Mais vídeos →</a>}
          </div>
        </section>
      )}
      <Campaigns campaigns={campaigns} position="sidebar" />
    </aside>
  );
}
function Lead({
  portal,
  articles,
  categories,
  campaigns,
  basePath,
}: {
  portal: Portal;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
}) {
  if (portal.template === "daily")
    return (
      <div className="daily-cover">
        <div className="daily-hero">
          {articles[0] && (
            <a href={`${basePath}/noticia/${articles[0].slug}`}>
              {articles[0].cover_url && (
                <NewsImage
                  src={articles[0].cover_url}
                  alt={articles[0].cover_alt}
                />
              )}
              <div>
                <CategoryLabel article={articles[0]} categories={categories} />
                <h2>{articles[0].title}</h2>
                <p>{articles[0].subtitle}</p>
              </div>
            </a>
          )}
        </div>
        <div className="daily-highlights">
          {articles.slice(1, 4).map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              categories={categories}
              basePath={basePath}
            />
          ))}
        </div>
      </div>
    );
  const hasRail =
    !!youtubeEmbed(portal.settings.videoUrl || "") ||
    campaigns.some((c) => c.position === "sidebar");
  return (
    <div className={`frontpage-grid ${hasRail ? "with-rail" : ""}`}>
      <div className="frontpage-main">
        <LeadCarousel
          articles={articles.slice(0, 4)}
          categories={categories}
          basePath={basePath}
        />
        {articles.length > 4 && (
          <div className="lead-digest">
            <ArticleCard
              article={articles[4]}
              categories={categories}
              basePath={basePath}
              variant="digest-lead"
            />
            <div className="compact-list">
              {articles.slice(5, 9).map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  categories={categories}
                  basePath={basePath}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {hasRail && <VideoRail portal={portal} campaigns={campaigns} />}
    </div>
  );
}
function Sponsor({ section }: { section: Section }) {
  return section.sponsorName || section.sponsorLogo ? (
    <a
      className="section-sponsor"
      style={{
        backgroundColor: /^#[0-9a-f]{6}$/i.test(section.sponsorColor || "")
          ? section.sponsorColor
          : "#ff9428",
      }}
      href={safeLink(section.sponsorLink || "")}
      rel="sponsored noopener noreferrer"
    >
      <small>Oferecimento</small>
      {section.sponsorLogo ? (
        <img
          src={safeLink(section.sponsorLogo)}
          alt={section.sponsorName || "Patrocinador"}
        />
      ) : (
        <strong>{section.sponsorName}</strong>
      )}
    </a>
  ) : null;
}
function CategorySection({
  section,
  articles,
  categories,
  campaigns,
  basePath,
}: {
  section: Section;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
}) {
  const selected = section.articleIds?.length
    ? section.articleIds
        .map((id) => articles.find((a) => a.id === id))
        .filter((a): a is Article => !!a)
    : articles.filter((a) => a.category_id === section.categoryId);
  if (!selected.length) return null;
  const title =
    section.title ||
    categories.find((c) => c.id === section.categoryId)?.name ||
    "Notícias";
  const magazine = section.layout === "magazine";
  return (
    <section
      className={`reference-category layout-${section.layout || "news"}`}
    >
      <div className="editoria-heading">
        <h2>{title}</h2>
        <Sponsor section={section} />
      </div>
      {magazine ? (
        <div className="magazine-category-grid">
          <div>
            <div className="magazine-lead-grid">
              {selected.slice(0, 2).map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  categories={categories}
                  basePath={basePath}
                />
              ))}
            </div>
            <div className="magazine-mini-grid">
              {selected.slice(2, 6).map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  categories={categories}
                  basePath={basePath}
                  variant="mini"
                />
              ))}
            </div>
          </div>
          <aside className="compact-list">
            {selected.slice(6, 10).map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                categories={categories}
                basePath={basePath}
                variant="compact"
              />
            ))}
          </aside>
        </div>
      ) : (
        <div className="category-mosaic">
          {selected.slice(0, 4).map((a, i) => (
            <ArticleCard
              key={a.id}
              article={a}
              categories={categories}
              basePath={basePath}
              variant={`overlay overlay-${i}`}
            />
          ))}
        </div>
      )}
      <div className="category-lower">
        {!magazine && (
          <div className="category-text-grid">
            {selected.slice(4, 10).map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                categories={categories}
                basePath={basePath}
                variant="text-card"
                showImage={false}
              />
            ))}
          </div>
        )}
        <Campaigns
          campaigns={campaigns}
          position={section.position || "category"}
        />
      </div>
    </section>
  );
}
export function Homepage({
  portal,
  articles,
  categories,
  campaigns,
  basePath,
  sections,
}: {
  portal: Portal;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
  sections?: Section[];
}) {
  const saved = sections ?? portal.home_published;
  const blocks = saved.length ? saved : referenceSections(categories,portal.template);
  return (
    <div className="reference-home">
      <h1 className="sr-only">{portal.name} — últimas notícias</h1>
      {!articles.length &&
        !blocks.some((s) => s.type === "text" || s.type === "image") && (
          <div className="public-empty">
            <h2>Em breve, novas histórias por aqui.</h2>
            <p>Acompanhe as próximas publicações.</p>
          </div>
        )}
      {blocks.map((s) => {
        const render = () => {
          const picks = s.articleIds?.length
            ? s.articleIds
                .map((id) => articles.find((a) => a.id === id))
                .filter((a): a is Article => !!a)
            : articles;
          if (s.type === "lead")
            return (
              <section key={s.id} className="homepage-section">
                {s.title && <h2 className="block-title">{s.title}</h2>}
                <Lead
                  portal={portal}
                  articles={picks}
                  categories={categories}
                  campaigns={campaigns}
                  basePath={basePath}
                />
              </section>
            );
          if (s.type === "category")
            return (
              <CategorySection
                key={s.id}
                section={s}
                articles={articles}
                categories={categories}
                campaigns={campaigns}
                basePath={basePath}
              />
            );
          if (s.type === "sponsored") {
            const article = s.articleIds?.length ? picks[0] : undefined;
            if (!article && !s.image && !s.text) return null;
            return (
              <section className="sponsored-strip" key={s.id}>
                {(s.image || article?.cover_url) && (
                  <a
                    href={
                      article
                        ? `${basePath}/noticia/${article.slug}`
                        : siteLink(s.link || "", basePath)
                    }
                  >
                    <NewsImage
                      src={s.image || article?.cover_url || ""}
                      alt={article?.cover_alt || s.title}
                    />
                  </a>
                )}
                <div>
                  <span className="news-kicker">
                    {s.title || "Publieditorial"}
                  </span>
                  {article ? (
                    <>
                      <Link href={`${basePath}/noticia/${article.slug}`}>
                        <h2>{article.title}</h2>
                      </Link>
                      <p>{article.subtitle}</p>
                    </>
                  ) : (
                    <p>{s.text}</p>
                  )}
                </div>
                <Campaigns campaigns={campaigns} position="sponsored" />
              </section>
            );
          }
          if (s.type === "video")
            return (
              <section className="homepage-section block-video">
                {s.title && <h2>{s.title}</h2>}
                {youtubeEmbed(s.videoUrl || "") ? (
                  <iframe
                    title={s.title || "Vídeo do portal"}
                    src={youtubeEmbed(s.videoUrl || "")}
                    allowFullScreen
                    loading="lazy"
                    allow="encrypted-media; picture-in-picture"
                  />
                ) : s.videoUrl && /\.(mp4|webm)(?:\?|$)/i.test(s.videoUrl) ? (
                  <video
                    controls
                    preload="metadata"
                    src={safeLink(s.videoUrl)}
                  />
                ) : null}
              </section>
            );
          if (s.type === "banner")
            return (
              <section className="homepage-section" key={s.id}>
                {s.title && <h2 className="block-title">{s.title}</h2>}
                <div
                  className={`ad-format ad-format-${s.adFormat || "billboard"}`}
                >
                  {s.image ? (
                    <aside className="public-ad">
                      <span>Publicidade</span>
                      <a
                        href={safeLink(s.link || "")}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                      >
                        <img
                          src={safeLink(s.image)}
                          alt={s.title || "Publicidade"}
                        />
                      </a>
                    </aside>
                  ) : (
                    <Campaigns
                      campaigns={
                        s.campaignId
                          ? campaigns.filter((c) => c.id === s.campaignId)
                          : campaigns
                      }
                      position={
                        s.campaignId
                          ? campaigns.find((c) => c.id === s.campaignId)
                              ?.position ||
                            s.position ||
                            "header"
                          : s.position || "header"
                      }
                    />
                  )}
                </div>
              </section>
            );
          return (
            <section key={s.id} className={`homepage-section block-${s.type}`}>
              {s.title && (
                <div className="editoria-heading">
                  <h2>{s.title}</h2>
                  <Sponsor section={s} />
                </div>
              )}
              {s.type === "text" ? (
                <div className="editorial-text">{s.text}</div>
              ) : s.type === "image" ? (
                s.image && (
                  <a href={siteLink(s.link || "", basePath)}>
                    <NewsImage src={s.image} alt={s.title} />
                  </a>
                )
              ) : s.type === "featured" ? (
                <Lead
                  portal={portal}
                  articles={picks}
                  categories={categories}
                  campaigns={campaigns}
                  basePath={basePath}
                />
              ) : portal.template === "daily" ? (
                <div className="daily-feed">
                  <NewsGrid
                    articles={picks.slice(0, 30)}
                    categories={categories}
                    basePath={basePath}
                  />
                  <aside className="daily-feed-sidebar">
                    <h3>Mais lidas</h3>
                    {picks.slice(0, 5).map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        categories={categories}
                        basePath={basePath}
                        variant="compact"
                      />
                    ))}
                    <Campaigns campaigns={campaigns} position="sidebar" />
                  </aside>
                </div>
              ) : (
                <NewsGrid
                  articles={picks.slice(0, 9)}
                  categories={categories}
                  basePath={basePath}
                />
              )}
            </section>
          );
        };
        return (
          <div
            key={s.id}
            className={`visual-section visual-width-${s.layoutWidth || "full"}`}
            style={{
              backgroundColor: s.backgroundColor,
              color: s.textColor,
              padding: s.padding ? `${s.padding}px` : undefined,
            }}
          >
            {render()}
          </div>
        );
      })}
    </div>
  );
}
