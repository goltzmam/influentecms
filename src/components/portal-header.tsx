"use client";
import { useEffect, useState, type CSSProperties } from "react";
import type { Experience } from "@/lib/experience";
export function PortalHeader({
  config = {},
  className,
  style,
  children,
  preview = false,
}: {
  config?: Experience["navigation"];
  preview?: boolean;
  className: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (preview || config.shrinkOnScroll === false) {
      setCompact(false);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setCompact((previous) =>
          window.scrollY > 120 ? true : window.scrollY < 24 ? false : previous,
        ),
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [config.shrinkOnScroll, preview]);
  return (
    <header
      data-edit-region="navigation"
      data-header-compact={compact}
      className={`${className} header-adaptive header-layout-${config.enabled === false ? "hidden" : config.layout || "horizontal"} header-align-${config.logoAlign || "left"} header-density-${config.density || "compact"} ${compact ? "header-is-compact" : ""} ${config.sticky !== false ? "adaptive-sticky" : ""} ${config.showTagline === false ? "header-no-tagline" : ""}`}
      style={
        {
          ...style,
          "--header-height": `${config.headerHeight ?? (config.density === "comfortable" ? 108 : 84)}px`,
          "--header-compact-height": `${config.compactHeight ?? 56}px`,
        } as CSSProperties
      }
    >
      {children}
    </header>
  );
}
