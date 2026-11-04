"use client";
import { createContext, useContext, useEffect, useRef } from "react";
const PreviewContext = createContext(false);
const EnabledContext = createContext(true);
export function GoogleAdsPreview({
  preview,
  enabled = true,
  children,
}: {
  preview: boolean;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <EnabledContext.Provider value={enabled}>
      <PreviewContext.Provider value={preview}>
        {children}
      </PreviewContext.Provider>
    </EnabledContext.Provider>
  );
}
const loaders = new Map<string, Promise<void>>();
function load(publisher: string) {
  if (!loaders.has(publisher)) {
    loaders.set(
      publisher,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}`;
        script.onload = () => resolve();
        script.onerror = () => {
          loaders.delete(publisher);
          reject(new Error("Ad unavailable"));
        };
        document.head.appendChild(script);
      }),
    );
  }
  return loaders.get(publisher)!;
}
export function GoogleAd({
  publisherId,
  slot,
  responsive = true,
  auto = false,
}: {
  publisherId: string;
  slot?: string;
  responsive?: boolean;
  auto?: boolean;
}) {
  const preview = useContext(PreviewContext);
  const enabled = useContext(EnabledContext);
  const node = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!enabled || preview || !/^ca-pub-\d{16}$/.test(publisherId)) return;
    let active = true;
    if (auto) {
      void load(publisherId).catch(() => {});
      return () => {
        active = false;
      };
    }
    const element = node.current;
    if (!element || !slot) return;
    let requested = false;
    const show = () => {
      if (
        requested ||
        !active ||
        element.getBoundingClientRect().width <= 0 ||
        element.closest("[inert]") ||
        element.getAttribute("data-adsbygoogle-status")
      )
        return;
      requested = true;
      void load(publisherId)
        .then(() => {
          if (!active || element.getAttribute("data-adsbygoogle-status"))
            return;
          try {
            const win = window as typeof window & { adsbygoogle?: object[] };
            (win.adsbygoogle = win.adsbygoogle || []).push({});
          } catch {
            /* A blocked or unfilled ad never interrupts reading. */
          }
        })
        .catch(() => {});
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) show();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    const resize = new ResizeObserver(show);
    resize.observe(element);
    return () => {
      active = false;
      observer.disconnect();
      resize.disconnect();
    };
  }, [publisherId, slot, auto, preview, enabled]);
  if (!enabled && !preview) return null;
  if (preview)
    return auto ? null : (
      <div className="ad-slot-placeholder google-campaign-placeholder">
        Google Ads · prévia
      </div>
    );
  if (auto) return null;
  return (
    <ins
      ref={node}
      className="adsbygoogle"
      style={{
        display: "block",
        width: "100%",
        height: responsive ? "auto" : "100%",
        minHeight: 90,
      }}
      data-ad-client={publisherId}
      data-ad-slot={slot}
      data-ad-format={responsive ? "auto" : undefined}
      data-full-width-responsive={responsive ? "true" : undefined}
    />
  );
}
