"use client";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import type { MenuItem, Experience } from "@/lib/experience";
import { safeLink } from "@/lib/links";
function address(value: string, base: string) {
  const safe = safeLink(value);
  return /^\/(?:$|noticia(?:\/|$)|categoria(?:\/|$)|pagina(?:\/|$)|busca(?:\?|$)|rss\.xml$)/.test(
    safe,
  )
    ? `${base}${safe === "/" ? "" : safe}` || "/"
    : safe;
}
function Items({
  items,
  basePath,
  onNavigate,
}: {
  items: MenuItem[];
  basePath: string;
  onNavigate?: () => void;
}) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>
          {item.children?.length ? (
            <details>
              <summary>
                <span>{item.label}</span>
                <span aria-hidden="true">+</span>
              </summary>
              {item.url && (
                <Link href={address(item.url, basePath)} onClick={onNavigate}>
                  Ver {item.label}
                </Link>
              )}
              <Items
                items={item.children}
                basePath={basePath}
                onNavigate={onNavigate}
              />
            </details>
          ) : (
            <Link href={address(item.url, basePath)} onClick={onNavigate}>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
export function PortalNavigation({
  items,
  basePath,
  name,
  logo,
  config = {},
}: {
  items: MenuItem[];
  basePath: string;
  name: string;
  logo?: string;
  config?: NonNullable<Experience["navigation"]>;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const mode = config.layout || "horizontal";
  const custom =
    config.customColors ??
    Boolean(config.background || config.color || config.accent);
  function close() {
    dialog.current?.close();
    setOpen(false);
    toggle.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <div
      className={`portal-navigation nav-mode-${mode}`}
      style={
        {
          "--drawer-background": custom
            ? config.background || "#ffffff"
            : "#ffffff",
          "--drawer-color": custom ? config.color || "#17342a" : "#17342a",
          "--nav-background": custom ? config.background : undefined,
          "--nav-color": custom ? config.color : undefined,
          "--nav-accent": custom ? config.accent : undefined,
          "--drawer-width": `${config.width || 350}px`,
        } as React.CSSProperties
      }
    >
      <button
        ref={toggle}
        type="button"
        className="menu-toggle"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <Menu size={22} aria-hidden="true" />
        <span>Menu</span>
      </button>
      <nav
        className="news-nav portal-nav-inline"
        aria-label="Navegação do portal"
      >
        <Items items={items} basePath={basePath} />
      </nav>
      <dialog
        ref={dialog}
        className="portal-menu-drawer"
        aria-label="Menu do portal"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) {
            const box = dialog.current.getBoundingClientRect();
            if (
              event.clientX > box.right ||
              event.clientY > box.bottom ||
              event.clientX < box.left
            )
              close();
          }
        }}
        onClose={() => setOpen(false)}
      >
        <div className="drawer-heading">
          {logo ? (
            <img src={safeLink(logo)} alt={name} />
          ) : (
            <strong>{name}</strong>
          )}
          <button type="button" aria-label="Fechar menu" onClick={close}>
            ×
          </button>
        </div>
        <nav aria-label="Menu lateral">
          <Items items={items} basePath={basePath} onNavigate={close} />
        </nav>
      </dialog>
    </div>
  );
}
