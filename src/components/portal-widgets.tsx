"use client";
import { useState, useRef, type CSSProperties } from "react";
import { Search, X, ArrowUpRight, MessageCircle } from "lucide-react";
import type { Settings } from "@/lib/types";
import {
  widgetEnabled,
  widgetPosition,
  widgetKinds,
  widgetNames,
  type WidgetKind,
} from "@/lib/widgets";
import { safeLink } from "@/lib/links";
import { youtubeEmbed } from "@/lib/presentation";
import { ContactForm, NewsletterForm } from "./reader-forms";
function address(value: string, base: string) {
  return /^\/(?:$|pagina\/|noticia\/|busca(?:\?|$)|categoria\/)/.test(value)
    ? `${base}${value === "/" ? "" : value}` || "/"
    : safeLink(value);
}
export function PortalWidget({
  kind,
  settings: s,
  portalId,
  basePath,
  preview = false,
}: {
  kind: WidgetKind;
  settings: Settings;
  portalId: string;
  basePath: string;
  preview?: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const c = s.experience?.[kind] || {};
  if (!widgetEnabled(s, kind)) return null;
  const style = {
    background:
      kind === "contact" && c.contentType !== "image"
        ? undefined
        : c.background,
    color:
      kind === "contact" && c.contentType !== "image" ? undefined : c.color,
    borderRadius:
      kind === "contact" && c.contentType !== "image" ? undefined : c.radius,
    padding:
      kind === "contact" && c.contentType !== "image"
        ? undefined
        : c.padding === undefined
          ? undefined
          : `${c.padding}px`,
    maxWidth: c.maxWidth ? `${c.maxWidth}px` : undefined,
    marginLeft: c.align === "left" ? 0 : "auto",
    marginRight: c.align === "right" ? 0 : "auto",
  } satisfies CSSProperties;
  let content: React.ReactNode;
  if (c.contentType === "image")
    content = c.image ? (
      <a
        href={address(c.imageLink || "", basePath)}
        className="portal-widget-image"
        aria-label={c.imageAlt || widgetNames[kind]}
        rel="sponsored noopener noreferrer"
      >
        <img src={safeLink(c.image)} alt={c.imageAlt ?? widgetNames[kind]} />
      </a>
    ) : preview ? (
      <p className="widget-empty">Escolha uma imagem para este bloco.</p>
    ) : null;
  else if (kind === "search") {
    const search = s.experience?.search;
    content = (
      <>
        <button
          type="button"
          className="header-search-toggle"
          aria-label={searchOpen ? "Fechar busca" : "Abrir busca"}
          aria-expanded={searchOpen}
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (!searchOpen) setTimeout(() => searchInput.current?.focus(), 50);
          }}
        >
          {searchOpen ? <X size={21} /> : <Search size={21} />}
        </button>
        <div className={`search-panel search-panel-${search?.preset ?? "outline"}`} style={{background: search?.background, color: search?.color, borderRadius: search?.radius}}>
          {search?.title && <strong className="search-title">{search.title}</strong>}
          {search?.description && <p className="search-description">{search.description}</p>}
        <form role="search" aria-label="Busca do portal"
          className={`public-search configurable-search search-preset-${search?.preset ?? "outline"} search-layout-${search?.layout ?? "inline"}`}
          action={`${basePath}/busca`}
          style={
            {
              "--search-height": `${search?.height ?? 44}px`,
              "--search-input-bg": search?.customStyle
                ? search.inputBackground
                : undefined,
              "--search-input-color": search?.customStyle
                ? search.inputColor
                : undefined,
              "--search-input-border": search?.customStyle
                ? search.inputBorder
                : undefined,
              "--search-button-bg": search?.customStyle
                ? search.buttonColor
                : undefined,
              "--search-button-color": search?.customStyle
                ? search.buttonTextColor
                : undefined,
            } as CSSProperties
          }
        >
          <input
            ref={searchInput}
            aria-label="Buscar notícias"
            type="search"
            name="q"
            required
            placeholder={search?.placeholder ?? "O que você procura?"}
            autoComplete="off"
            enterKeyHint="search"
            disabled={preview}
          />
          <button disabled={preview} aria-label={search?.buttonLabel || "Buscar"}>
            {search?.buttonMode !== "text" && search?.buttonMode && <Search size={18} aria-hidden="true" />}
            {search?.buttonMode !== "icon" && (search?.buttonLabel || "Buscar")}
          </button>
        </form></div>
      </>
    );
  } else if (kind === "contact")
    content = (
      <ContactForm
        config={s.experience?.contact}
        portalId={portalId}
        title={
          s.experience?.contact?.title ?? s.contactTitle ?? "Fale com a redação"
        }
        privacyUrl={s.privacyUrl ? address(s.privacyUrl, basePath) : undefined}
        preview={preview}
      />
    );
  else if (kind === "newsletter") {
    const n = s.experience?.newsletter;
    if (n?.showForm === false && !(n?.showWhatsapp !== false && s.whatsappUrl))
      return null;
    content = (
      <div className="newsletter-widget-inner">
        {n?.showForm !== false && (
          <NewsletterForm
            portalId={portalId}
            title={
              n?.title ?? s.newsletterTitle ?? "Receba novidades por e-mail"
            }
            config={n}
            preview={preview}
          />
        )}
        {n?.showWhatsapp !== false && s.whatsappUrl && (
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
    );
  } else {
    const a = s.experience?.commercial;
    content = (
      <>
        {a?.image && (
          <a
            className="footer-advert-image"
            href={address(a.imageLink || a.link || "", basePath)}
            rel="sponsored noopener noreferrer"
          >
            <img
              src={safeLink(a.image)}
              alt={a.imageAlt ?? a.title ?? "Anuncie com a gente"}
            />
          </a>
        )}
        {a?.video &&
          (youtubeEmbed(a.video) ? (
            <iframe
              title={a.title ?? "Oportunidades comerciais"}
              src={youtubeEmbed(a.video)}
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video controls src={safeLink(a.video)} />
          ))}
        {a?.link ? (
          <a className="footer-advert-cta" href={address(a.link, basePath)}>
            {a.title !== "" && (
              <strong>{a?.title || "Anuncie com a gente"}</strong>
            )}
            {a?.body && <p>{a.body}</p>}
            {a?.buttonLabel !== "" && (
              <span>
                {a?.buttonLabel ?? "Conheça as oportunidades"}{" "}
                <ArrowUpRight size={14} />
              </span>
            )}
          </a>
        ) : (
          <>
            {a?.title && <strong>{a.title}</strong>}
            {a?.body && <p>{a.body}</p>}
          </>
        )}
        {a?.showContacts !== false && (
          <>
            {s.commercialPhone && (
              <a href={`tel:${s.commercialPhone.replace(/[^+0-9]/g, "")}`}>
                {s.commercialPhone}
              </a>
            )}
            {s.commercialEmail && (
              <a href={`mailto:${s.commercialEmail}`}>{s.commercialEmail}</a>
            )}
          </>
        )}
      </>
    );
  }
  if (!content) return null;
  return (
    <section
      className={`portal-widget widget-${kind} ${kind === "commercial" ? "footer-commercial" : ""} ${kind === "newsletter" ? "news-newsletter" : ""}`}
      data-edit-region={kind}
      data-widget-kind={kind}
      data-search-open={kind === "search" ? searchOpen : undefined}
      onKeyDown={
        kind === "search"
          ? (e) => {
              if (e.key === "Escape") setSearchOpen(false);
            }
          : undefined
      }
      style={style}
      draggable={preview}
      onDragStart={
        preview
          ? (e) => {
              e.stopPropagation();
              e.dataTransfer.setData("application/x-influente-widget", kind);
            }
          : undefined
      }
    >
      {content}
    </section>
  );
}
export function PortalWidgets({
  location,
  sectionId,
  settings,
  portalId,
  basePath,
  preview = false,
  sections = [],
  home = true,
  exclude = [],
}: {
  location: string;
  sectionId?: string;
  settings: Settings;
  portalId: string;
  basePath: string;
  preview?: boolean;
  sections?: string[];
  home?: boolean;
  exclude?: WidgetKind[];
}) {
  return (
    <>
      {widgetKinds
        .filter(
          (kind) =>
            !exclude.includes(kind) &&
            widgetPosition(settings.experience || {}, kind, sections, home) ===
              location &&
            (!sectionId ||
              settings.experience?.[kind]?.sectionId === sectionId),
        )
        .map((kind) => (
          <PortalWidget
            key={kind}
            kind={kind}
            settings={settings}
            portalId={portalId}
            basePath={basePath}
            preview={preview}
          />
        ))}
    </>
  );
}
