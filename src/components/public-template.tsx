import { AdSlotView } from "./ad-slot";
import { GoogleAd, GoogleAdsPreview } from "./google-ad";
import { referenceAdSlots } from "@/lib/advertising";
import { Fragment } from "react";
import type { MenuItem } from "@/lib/experience";
import { PortalNavigation } from "./portal-navigation";
import { AdCreative, PartnerCard } from "./ad-creative";
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
  ArrowUpRight,
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
function FooterLinks({
  items,
  basePath,
}: {
  items: MenuItem[];
  basePath: string;
}) {
  return (
    <ul className="footer-links">
      {items.map((item, index) => (
        <li key={index}>
          <Link href={siteLink(item.url, basePath)}>{item.label}</Link>
          {item.children?.length ? (
            <FooterLinks items={item.children} basePath={basePath} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
function EditorialHeader({
  portal,
  settings: s,
  links,
  basePath,
  preview,
}: {
  portal: Portal;
  settings: Portal["settings"];
  links: MenuItem[];
  basePath: string;
  preview: boolean;
}) {
  const daily = portal.template === "daily";
  const brand = (
    <Link className="news-logo" href={basePath || "/"}>
      {s.logo ? (
        <img src={safeLink(s.logo)} alt={portal.name} />
      ) : (
        <span>{portal.name}</span>
      )}
    </Link>
  );
  const navigation = (
    <PortalNavigation
      items={links}
      basePath={basePath}
      name={portal.name}
      logo={s.logo}
      config={s.experience?.navigation}
    />
  );
  const search = (
    <form className="public-search" action={`${basePath}/busca`}>
      <input
        aria-label="Buscar notícias"
        type="search"
        name="q"
        placeholder="O que você procura?"
        required
        disabled={preview}
      />
      <button disabled={preview}>Buscar</button>
    </form>
  );
  return (
    <header
      data-edit-region="navigation"
      className={`reference-header editorial-header editorial-menu-${s.experience?.navigation?.layout || "horizontal"} ${daily ? "daily-masthead" : "magazine-masthead"} ${s.experience?.navigation?.sticky ? "header-sticky" : ""} editorial-logo-${s.experience?.navigation?.logoAlign || "center"}`}
      style={{
        backgroundColor: s.experience?.navigation?.customColors
          ? s.experience.navigation.background
          : undefined,
        color: s.experience?.navigation?.customColors
          ? s.experience.navigation.color
          : undefined,
      }}
    >
      {daily ? (
        <>
          <div className="daily-brandbar">
            <div className="daily-edition-label">{s.tagline}</div>
            {brand}
            <div className="daily-search">{search}</div>
          </div>
          <div className="daily-navigation-bar">{navigation}</div>
        </>
      ) : (
        <>
          <div className="magazine-utility">
            <span>{s.tagline}</span>
            {s.whatsappUrl && (
              <a
                href={safeLink(s.whatsappUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Acompanhe no WhatsApp <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          <div className="magazine-brandbar">
            {brand}
            <div className="magazine-search">{search}</div>
          </div>
          <div className="magazine-navigation-bar">{navigation}</div>
        </>
      )}
      {s.header && <p className="header-editorial-note">{s.header}</p>}
    </header>
  );
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
  const boundIds = new Set(
    (portal.home_published || []).flatMap((section) =>
      (section.adSlots || []).map((slot) => slot.campaignId).filter(Boolean),
    ),
  );
  const automaticCampaigns = campaigns.filter((c) => !boundIds.has(c.id));
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
    <GoogleAdsPreview preview={preview} enabled={!!s.advertising?.enabled}>
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
        {!preview &&
          s.advertising?.enabled &&
          s.advertising.autoAds &&
          s.advertising.publisherId && (
            <GoogleAd publisherId={s.advertising.publisherId} auto />
          )}
        {preview && (
          <div className="preview-ribbon">
            PRÉ-VISUALIZAÇÃO PRIVADA · Conteúdo não publicado
          </div>
        )}
        {portal.template === "classic" ? (
          <header
            data-edit-region="navigation"
            className={`reference-header nav-logo-${s.experience?.navigation?.logoAlign || "left"} ${s.experience?.navigation?.sticky ? "header-sticky" : ""}`}
            style={{
              backgroundColor: s.experience?.navigation?.customColors
                ? s.experience.navigation.background
                : undefined,
              color: s.experience?.navigation?.customColors
                ? s.experience.navigation.color
                : undefined,
            }}
          >
            <div className={`news-masthead masthead-${portal.template}`}>
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
              <PortalNavigation
                items={links}
                basePath={basePath}
                name={portal.name}
                logo={s.logo}
                config={s.experience?.navigation}
              />
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
        ) : (
          <EditorialHeader
            portal={portal}
            settings={s}
            links={links}
            basePath={basePath}
            preview={preview}
          />
        )}
        <main className="news-container">
          <Campaigns campaigns={automaticCampaigns} position="header" />
          <Campaigns campaigns={automaticCampaigns} position="before-content" />
          {children}
          <Campaigns campaigns={automaticCampaigns} position="after-content" />
          <Campaigns campaigns={automaticCampaigns} position="footer" />
          {partners.length > 0 && (
            <section
              data-edit-region="partners"
              className={`public-partners premium-partners partners-${s.experience?.partners?.layout || "cards"}`}
              style={
                {
                  background: s.experience?.partners?.background,
                  color: s.experience?.partners?.color,
                  "--partner-columns": s.experience?.partners?.columns || 4,
                  "--partner-card-bg": s.experience?.partners?.cardBackground,
                  "--partner-radius": `${s.experience?.partners?.radius ?? 16}px`,
                } as CSSProperties
              }
            >
              <div className="partner-section-heading">
                <div>
                  <span className="section-overline">
                    CONEXÕES QUE IMPORTAM
                  </span>
                  <h2>
                    {s.experience?.partners?.title ||
                      "Quem caminha com a gente"}
                  </h2>
                  {s.experience?.partners?.subtitle && (
                    <p>{s.experience.partners.subtitle}</p>
                  )}
                </div>
                <span className="partner-count">
                  {partners.length}{" "}
                  {partners.length === 1 ? "parceiro" : "parceiros"}
                </span>
              </div>
              <div className="premium-partner-grid">
                {partners.map((p) => (
                  <PartnerCard
                    key={p.id}
                    partner={p}
                    showName={s.experience?.partners?.showNames !== false}
                    fit={s.experience?.partners?.imageFit}
                  />
                ))}
              </div>
            </section>
          )}
          {(s.socialCards?.some((c) => c.image) ||
            (s.contactEnabled && s.experience?.contact?.mode !== "hidden")) && (
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
                  config={s.experience?.contact}
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
        <footer
          data-edit-region="footer"
          className={`news-footer footer-layout-${s.experience?.footer?.layout || "columns"}`}
          style={
            {
              background: s.experience?.footer?.background,
              color: s.experience?.footer?.color,
              "--footer-columns": Math.min(
                s.experience?.footer?.columns || 4,
                1 +
                  (s.experience?.footer?.showMenu !== false ? 1 : 0) +
                  (s.experience?.footer?.showCommercial !== false ? 1 : 0) +
                  (s.experience?.footer?.showSocials !== false &&
                  s.socials?.length
                    ? 1
                    : 0),
              ),
            } as CSSProperties
          }
        >
          <div className="footer-columns">
            <section>
              {s.experience?.footer?.showLogo !== false && (
                <Link className="news-logo" href={basePath || "/"}>
                  {s.experience?.footer?.logo || s.logo ? (
                    <img
                      src={safeLink(s.experience?.footer?.logo || s.logo || "")}
                      alt={portal.name}
                    />
                  ) : (
                    <span>{portal.name}</span>
                  )}
                </Link>
              )}
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
            {s.experience?.footer?.showMenu !== false && (
              <nav aria-label="Navegação do rodapé">
                <FooterLinks
                  items={
                    s.experience?.footer?.menus?.length
                      ? s.experience.footer.menus
                      : links
                  }
                  basePath={basePath}
                />
                {s.experience?.footer?.showRss !== false && (
                  <Link href={`${basePath}/rss.xml`}>RSS</Link>
                )}
              </nav>
            )}
            {s.experience?.footer?.showCommercial !== false && (
              <section
                className="footer-commercial"
                style={{
                  background: s.experience?.footer?.advertBackground,
                  color: s.experience?.footer?.advertColor,
                }}
              >
                {s.experience?.footer?.advertImage && (
                  <a
                    className="footer-advert-image"
                    href={siteLink(
                      s.experience.footer.advertLink || "",
                      basePath,
                    )}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                  >
                    <img
                      src={safeLink(s.experience.footer.advertImage)}
                      alt={
                        s.experience.footer.advertTitle || "Anuncie com a gente"
                      }
                    />
                  </a>
                )}
                {s.experience?.footer?.advertVideo && (
                  <div className="footer-advert-video">
                    {youtubeEmbed(s.experience.footer.advertVideo) ? (
                      <iframe
                        title="Conheça nossas oportunidades"
                        src={youtubeEmbed(s.experience.footer.advertVideo)}
                        allowFullScreen
                        loading="lazy"
                      />
                    ) : (
                      <video
                        controls
                        src={safeLink(s.experience.footer.advertVideo)}
                      />
                    )}
                  </div>
                )}
                {s.experience?.footer?.advertLink ? (
                  <a
                    className="footer-advert-cta"
                    href={siteLink(s.experience.footer.advertLink, basePath)}
                  >
                    <strong>
                      {s.experience.footer.advertTitle || "Anuncie com a gente"}
                    </strong>
                    <p>{s.commercialText}</p>
                    <span>
                      Conheça as oportunidades{" "}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </span>
                  </a>
                ) : (
                  <p>{s.commercialText}</p>
                )}
                {s.commercialPhone && (
                  <a href={`tel:${s.commercialPhone.replace(/[^+0-9]/g, "")}`}>
                    {s.commercialPhone}
                  </a>
                )}
                {s.commercialEmail && (
                  <a href={`mailto:${s.commercialEmail}`}>
                    {s.commercialEmail}
                  </a>
                )}
              </section>
            )}
            {s.experience?.footer?.showSocials !== false &&
              !!s.socials?.length && (
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
              )}
          </div>
          {s.experience?.footer?.showSearch && (
            <form className="footer-search" action={`${basePath}/busca`}>
              <input
                name="q"
                placeholder="O que você procura?"
                aria-label="Buscar no rodapé"
                disabled={preview}
              />
              <button disabled={preview}>Buscar</button>
            </form>
          )}
          {s.footer && <p className="footer-note">{s.footer}</p>}
          <small>
            {s.experience?.footer?.copyright ||
              `© ${new Date().getFullYear()} ${portal.name} · Todos os direitos reservados.`}
          </small>
        </footer>
      </div>
    </GoogleAdsPreview>
  );
}
export function Campaigns({
  campaigns,
  position,
  sectionId,
}: {
  campaigns: Campaign[];
  position: string;
  sectionId?: string;
}) {
  return (
    <>
      {campaigns
        .filter((c) => {
          const targets = c.creative?.sectionIds;
          if (targets?.length)
            return (
              !!sectionId &&
              targets.includes(sectionId) &&
              (position === "inline" || c.position === position)
            );
          return !sectionId && c.position === position;
        })
        .sort((a, b) => (a.creative?.order || 0) - (b.creative?.order || 0))
        .map((c) => (
          <AdCreative key={c.id} campaign={c} />
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
function InlineFeedAds({
  campaigns,
  index,
}: {
  campaigns: Campaign[];
  index: number;
}) {
  return (
    <>
      {campaigns
        .filter(
          (c) =>
            c.position === "inline" &&
            !c.creative?.sectionIds?.length &&
            !!c.creative?.repeatEvery &&
            (index + 1) % c.creative.repeatEvery === 0,
        )
        .map((c) => (
          <div className="feed-ad" key={c.id}>
            <AdCreative campaign={c} />
          </div>
        ))}
    </>
  );
}
export function NewsGrid({
  articles,
  categories,
  basePath,
  hero = false,
  campaigns = [],
}: {
  articles: Article[];
  categories: Category[];
  basePath: string;
  hero?: boolean;
  campaigns?: Campaign[];
}) {
  return (
    <div className={`news-grid ${hero ? "lead-grid" : ""}`}>
      {articles.map((a, index) => (
        <Fragment key={a.id}>
          <ArticleCard
            key={a.id}
            article={a}
            categories={categories}
            basePath={basePath}
          />
          <InlineFeedAds campaigns={campaigns} index={index} />
        </Fragment>
      ))}
    </div>
  );
}
function VideoRail({
  portal,
  campaigns,
  children,
}: {
  portal: Portal;
  campaigns: Campaign[];
  children?: React.ReactNode;
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
      {children}
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
  rail,
  sponsored,
}: {
  portal: Portal;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
  rail?: React.ReactNode;
  sponsored?: React.ReactNode;
}) {
  if (portal.template === "modern") {
    const cover = articles[0];
    if (!cover) return null;
    return (
      <div className="magazine-cover" data-theme-composition="magazine-cover">
        <div className="magazine-cover-story">
          <div className="magazine-cover-copy">
            <CategoryLabel article={cover} categories={categories} />
            <Link href={`${basePath}/noticia/${cover.slug}`}>
              <h2>{cover.title}</h2>
            </Link>
            {cover.subtitle && <p>{cover.subtitle}</p>}
            <span className="magazine-byline">Por {cover.author}</span>
            <Link
              className="magazine-read"
              href={`${basePath}/noticia/${cover.slug}`}
            >
              Ler reportagem <ArrowUpRight size={18} />
            </Link>
          </div>
          {cover.cover_url && (
            <Link
              className="magazine-cover-image"
              href={`${basePath}/noticia/${cover.slug}`}
              tabIndex={-1}
              aria-hidden="true"
            >
              <NewsImage src={cover.cover_url} alt={cover.cover_alt} priority />
            </Link>
          )}
        </div>
        {articles.length > 1 && (
          <div className="magazine-story-ribbon">
            {articles.slice(1, 4).map((a) => (
              <ArticleCard
                key={a.id}
                article={a}
                categories={categories}
                basePath={basePath}
                variant="magazine-ribbon-card"
              />
            ))}
          </div>
        )}
        {rail && <aside className="magazine-ad-rail">{rail}</aside>}
        {youtubeEmbed(portal.settings.videoUrl || "") && (
          <div className="magazine-video-feature">
            <VideoRail portal={portal} campaigns={[]} />
          </div>
        )}
      </div>
    );
  }
  if (portal.template === "daily")
    return (
      <div className="daily-cover" data-theme-composition="daily-cover">
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
        {rail && <aside className="daily-cover-ad-rail">{rail}</aside>}
      </div>
    );
  const hasRail =
    !!rail ||
    !!youtubeEmbed(portal.settings.videoUrl || "") ||
    campaigns.some((c) => c.position === "sidebar");
  return (
    <div
      data-theme-composition="classic-cover"
      className={`frontpage-grid ${hasRail ? "with-rail" : ""}`}
    >
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
        {sponsored}
      </div>
      {hasRail && (
        <VideoRail portal={portal} campaigns={campaigns}>
          {rail}
        </VideoRail>
      )}
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
  template,
  section,
  articles,
  categories,
  campaigns,
  basePath,
  headingAds,
  sidebarAds,
}: {
  template: Portal["template"];
  section: Section;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
  headingAds?: React.ReactNode;
  sidebarAds?: React.ReactNode;
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
  if (template === "modern")
    return (
      <section
        className="reference-category magazine-department"
        data-theme-composition="magazine-department"
      >
        <div className="editoria-heading">
          <h2>{title}</h2>
          <Sponsor section={section} />
          {headingAds}
        </div>
        <div className="magazine-department-grid">
          {selected.slice(0, 5).map((a, i) => (
            <ArticleCard
              key={a.id}
              article={a}
              categories={categories}
              basePath={basePath}
              variant={
                i === 0
                  ? "magazine-department-lead"
                  : "magazine-department-card"
              }
            />
          ))}
        </div>
        {sidebarAds && (
          <aside className="category-monetization-ads">{sidebarAds}</aside>
        )}
        <Campaigns
          campaigns={campaigns}
          position={section.position || "category"}
        />
      </section>
    );
  if (template === "daily")
    return (
      <section
        className="reference-category daily-department"
        data-theme-composition="daily-department"
      >
        <div className="editoria-heading">
          <h2>{title}</h2>
          <Sponsor section={section} />
          {headingAds}
        </div>
        <div className="daily-department-grid">
          {selected.slice(0, 4).map((a, i) => (
            <ArticleCard
              key={a.id}
              article={a}
              categories={categories}
              basePath={basePath}
              variant={
                i === 0 ? "daily-department-lead" : "daily-department-item"
              }
            />
          ))}
        </div>
        {sidebarAds && (
          <aside className="category-monetization-ads">{sidebarAds}</aside>
        )}
        <Campaigns
          campaigns={campaigns}
          position={section.position || "category"}
        />
      </section>
    );
  const magazine = section.layout === "magazine";
  return (
    <section
      className={`reference-category layout-${section.layout || "news"}`}
    >
      <div className="editoria-heading">
        <h2>{title}</h2>
        <Sponsor section={section} />
        {headingAds}
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
        <aside className="category-lower-ads">
          {sidebarAds}
          <Campaigns
            campaigns={campaigns}
            position={section.position || "category"}
          />
        </aside>
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
  preview = false,
  frame,
}: {
  portal: Portal;
  articles: Article[];
  categories: Category[];
  campaigns: Campaign[];
  basePath: string;
  sections?: Section[];
  preview?: boolean;
  frame?: (section: Section, content: React.ReactNode) => React.ReactNode;
}) {
  const saved = sections ?? portal.home_published;
  const blocks = (
    saved.length ? saved : referenceSections(categories, portal.template)
  ).map((section) => ({
    ...section,
    adSlots: section.adSlots ?? referenceAdSlots(section.type, section.id),
  }));
  const availableCampaigns = campaigns;
  const boundCampaignIds = new Set(
    blocks.flatMap((section) =>
      section.adSlots.map((slot) => slot.campaignId).filter(Boolean),
    ),
  );
  campaigns = campaigns.filter((c) => !boundCampaignIds.has(c.id));
  const ads = (section: Section, zone: string) => {
    const slots = (section.adSlots || []).filter(
      (slot) =>
        slot.zone === zone &&
        slot.enabled !== false &&
        (preview ||
          slot.showEmpty ||
          availableCampaigns.some(
            (c) => c.id === slot.campaignId && c.active,
          ) ||
          (slot.kind === "google" &&
            portal.settings.advertising?.enabled &&
            slot.googleSlot)),
    );
    return slots.length ? (
      <div className={`section-ad-zone zone-${zone}`} data-ad-zone={zone}>
        {slots.map((slot) => (
          <AdSlotView
            key={slot.id}
            slot={slot}
            sectionId={section.id}
            campaigns={availableCampaigns}
            advertising={portal.settings.advertising}
            preview={preview}
          />
        ))}
      </div>
    ) : null;
  };
  const dailyLeadIds = new Set(
    blocks
      .filter((b) => b.type === "lead" || b.type === "featured")
      .map((b) => (b.articleIds?.length ? b.articleIds[0] : articles[0]?.id))
      .filter(Boolean),
  );
  const render = (s: Section): React.ReactNode => {
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
            rail={ads(s, "sidebar")}
            sponsored={
              portal.template === "classic" &&
              blocks[blocks.findIndex((b) => b.id === s.id) + 1]?.type ===
                "sponsored"
                ? wrap(
                    blocks[blocks.findIndex((b) => b.id === s.id) + 1],
                    render(blocks[blocks.findIndex((b) => b.id === s.id) + 1]),
                  )
                : undefined
            }
          />
        </section>
      );
    if (s.type === "category")
      return (
        <CategorySection
          template={portal.template}
          key={s.id}
          section={s}
          headingAds={ads(s, "heading")}
          sidebarAds={ads(s, "sidebar")}
          articles={articles}
          categories={categories}
          campaigns={campaigns}
          basePath={basePath}
        />
      );
    if (s.type === "sponsored") {
      const article = s.articleIds?.length ? picks[0] : undefined;
      if (!article && !s.image && !s.text && !s.videoUrl && !preview)
        return null;
      return (
        <section className="sponsored-strip" key={s.id}>
          {preview && !s.videoUrl && !s.image && !article?.cover_url && (
            <div className="sponsored-empty-art">
              Publieditorial
              <br />
              em destaque
            </div>
          )}
          {s.videoUrl && (
            <div className="sponsored-video">
              {youtubeEmbed(s.videoUrl) ? (
                <iframe
                  title={s.title || "Vídeo patrocinado"}
                  src={youtubeEmbed(s.videoUrl)}
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <video controls src={safeLink(s.videoUrl)} />
              )}
            </div>
          )}
          {!s.videoUrl && (s.image || article?.cover_url) && (
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
            <span className="news-kicker">{s.title || "Publieditorial"}</span>
            {article ? (
              <>
                <Link href={`${basePath}/noticia/${article.slug}`}>
                  <h2>{article.title}</h2>
                </Link>
                <p>{article.subtitle}</p>
              </>
            ) : (
              <p>
                {s.text ||
                  (preview
                    ? "Escolha uma reportagem ou adicione imagem, vídeo e chamada para esta parceria."
                    : "")}
              </p>
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
            <video controls preload="metadata" src={safeLink(s.videoUrl)} />
          ) : null}
        </section>
      );
    if (s.type === "banner")
      return (
        <section className="homepage-section" key={s.id}>
          {s.title && <h2 className="block-title">{s.title}</h2>}
          <div className={`ad-format ad-format-${s.adFormat || "billboard"}`}>
            {s.videoUrl ? (
              <AdCreative
                campaign={{
                  id: s.id,
                  name: s.title || "Publicidade",
                  image_url: s.image || "",
                  link: s.link || "",
                  position: s.position || "header",
                  active: true,
                  starts_at: null,
                  ends_at: null,
                  creative: {
                    mediaType: "video",
                    format: s.adFormat || "auto",
                    videoUrl: s.videoUrl,
                  },
                }}
              />
            ) : s.image ? (
              <aside className="public-ad">
                <span>Publicidade</span>
                <a
                  href={safeLink(s.link || "")}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  <img src={safeLink(s.image)} alt={s.title || "Publicidade"} />
                </a>
              </aside>
            ) : (
              <Campaigns
                campaigns={
                  s.campaignId
                    ? availableCampaigns.filter((c) => c.id === s.campaignId)
                    : campaigns
                }
                position={
                  s.campaignId
                    ? availableCampaigns.find((c) => c.id === s.campaignId)
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
        ) : portal.template === "modern" ? (
          <div
            className="magazine-latest"
            data-theme-composition="magazine-latest"
          >
            {picks.slice(0, 9).map((a, index) => (
              <Fragment key={a.id}>
                <ArticleCard
                  article={a}
                  categories={categories}
                  basePath={basePath}
                  variant="magazine-latest-card"
                />
                <InlineFeedAds campaigns={campaigns} index={index} />
              </Fragment>
            ))}
            <div className="magazine-ad-break">
              <Campaigns campaigns={campaigns} position="sidebar" />
            </div>
          </div>
        ) : portal.template === "daily" ? (
          <div className="daily-feed">
            <NewsGrid
              campaigns={campaigns}
              articles={picks
                .filter((a) => !dailyLeadIds.has(a.id))
                .slice(0, 30)}
              categories={categories}
              basePath={basePath}
            />
            <aside className="daily-feed-sidebar">
              <h3>Em destaque</h3>
              {picks.slice(0, 5).map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  categories={categories}
                  basePath={basePath}
                  variant="compact"
                />
              ))}
              <VideoRail portal={portal} campaigns={campaigns} />
            </aside>
          </div>
        ) : (
          <NewsGrid
            campaigns={campaigns}
            articles={picks.slice(0, 9)}
            categories={categories}
            basePath={basePath}
          />
        )}
      </section>
    );
  };
  const wrap = (s: Section, content: React.ReactNode): React.ReactNode => {
    const node = (
      <div
        key={s.id}
        data-section-type={s.type}
        data-section-id={s.id}
        className={`visual-section visual-width-${s.layoutWidth || "full"} ${s.titleColor ? "has-title-color" : ""} ${s.titleBackground ? "has-title-bg" : ""} ${s.titleSize ? "has-title-size" : ""} ${s.copyColor ? "has-copy-color" : ""} ${s.copySize ? "has-copy-size" : ""} ${s.cardBackground ? "has-card-bg" : ""}`}
        style={
          {
            backgroundColor: s.backgroundColor,
            color: s.textColor,
            "--section-title-color": s.titleColor,
            "--section-title-bg": s.titleBackground,
            "--section-copy-color": s.copyColor,
            "--section-card-bg": s.cardBackground,
            "--section-title-size": s.titleSize
              ? `${s.titleSize}px`
              : undefined,
            "--section-copy-size": s.copySize ? `${s.copySize}px` : undefined,
            borderRadius: s.radius,
            textAlign: s.align,
            padding: s.padding ? `${s.padding}px` : undefined,
          } as CSSProperties
        }
      >
        <Campaigns
          campaigns={campaigns.filter(
            (c) => c.creative?.sectionPlacement === "before",
          )}
          position="inline"
          sectionId={s.id}
        />
        {ads(s, "before")}
        {s.type !== "category" && ads(s, "heading")}
        {s.type !== "category" &&
        s.type !== "lead" &&
        s.type !== "featured" &&
        ads(s, "sidebar") ? (
          <div className="section-ad-layout">
            <div>{content}</div>
            <aside>{ads(s, "sidebar")}</aside>
          </div>
        ) : (
          content
        )}
        {ads(s, "after")}
        <Campaigns
          campaigns={campaigns.filter(
            (c) => c.creative?.sectionPlacement !== "before",
          )}
          position="inline"
          sectionId={s.id}
        />
      </div>
    );
    return frame ? frame(s, node) : node;
  };
  return (
    <div
      className={`reference-home home-${portal.template}`}
      data-theme={portal.template}
    >
      <h1 className="sr-only">{portal.name} — últimas notícias</h1>
      {!articles.length &&
        !blocks.some((s) => s.type === "text" || s.type === "image") && (
          <div className="public-empty">
            <h2>Em breve, novas histórias por aqui.</h2>
            <p>Acompanhe as próximas publicações.</p>
          </div>
        )}
      {blocks
        .filter(
          (section, index) =>
            !(
              portal.template === "classic" &&
              section.type === "sponsored" &&
              blocks[index - 1]?.type === "lead"
            ),
        )
        .map((section) => wrap(section, render(section)))}
    </div>
  );
}
