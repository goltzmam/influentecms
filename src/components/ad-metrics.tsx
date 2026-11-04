"use client";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import type { MetricEvent } from "@/lib/metrics/schema";
type Context = { endpoint: string; preview: boolean; pageView: string };
const MetricsContext = createContext<Context | null>(null);
const batches = new Map<string, MetricEvent[]>();
let timer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  for (const [endpoint, events] of batches) {
    batches.delete(endpoint);
    for (let i = 0; i < events.length; i += 12) {
      const body = JSON.stringify({ events: events.slice(i, i + 12) });
      if (
        !navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: "application/json" }),
        )
      )
        void fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
    }
  }
}
function queue(endpoint: string, event: MetricEvent) {
  batches.set(endpoint, [...(batches.get(endpoint) || []), event]);
  if (!timer)
    timer = setTimeout(() => {
      timer = undefined;
      flush();
    }, 350);
}
function id(key: string, session = false) {
  try {
    const store = session ? sessionStorage : localStorage;
    let value = store.getItem(key);
    if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
      value = crypto.randomUUID();
      store.setItem(key, value);
    }
    return value;
  } catch {
    return null;
  }
}
export function AdMetricsProvider({
  endpoint,
  preview,
  children,
}: {
  endpoint: string;
  preview: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const value = useMemo<Context>(
    () => ({ endpoint, preview, pageView: "" }),
    [endpoint, preview, path],
  );
  useEffect(() => {
    const end = () => flush();
    window.addEventListener("pagehide", end);
    return () => window.removeEventListener("pagehide", end);
  }, []);
  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
}
export function AdMetrics({
  id: item,
  kind,
  placement,
  mediaType,
  demo = false,
  children,
}: {
  id: string;
  kind: "campaign" | "partner";
  placement: string;
  mediaType?: string;
  demo?: boolean;
  children: React.ReactNode;
}) {
  const context = useContext(MetricsContext),
    node = useRef<HTMLDivElement>(null),
    send = useRef<(event: MetricEvent["event"], value?: number) => void>(
      () => {},
    );
  useEffect(() => {
    const element = node.current;
    if (
      !element ||
      !context ||
      context.preview ||
      demo ||
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    const visitor = id("flue-visitor-" + context.endpoint),
      session = id("flue-session-" + context.endpoint, true);
    if (!visitor || !session) return;
    if (!context.pageView) context.pageView = crypto.randomUUID();
    const source = () => {
      try {
        const host = new URL(document.referrer).hostname;
        return host === location.hostname ? "interno" : host;
      } catch {
        return "direto";
      }
    };
    const pagePath = location.pathname.slice(0, 300);
    send.current = (event, value = 0) =>
      queue(context.endpoint, {
        id: crypto.randomUUID(),
        item,
        kind,
        event,
        value,
        visitor,
        session,
        pageView: context.pageView,
        placement,
        path: pagePath,
        source: source().slice(0, 120),
        device: /ipad|tablet/i.test(navigator.userAgent)
          ? "tablet"
          : /mobile|android/i.test(navigator.userAgent)
            ? "mobile"
            : "desktop",
      });
    let served = false;
    const render = () => {
      const rect = element.getBoundingClientRect();
      if (!served && rect.width > 0 && rect.height > 0) {
        served = true;
        send.current("served");
      }
    };
    render();
    const resized = new ResizeObserver(render);
    resized.observe(element);
    let viewed = false,
      visible = false;
    let viewTimer: ReturnType<typeof setTimeout> | undefined;
    const observe = () => {
      if (viewed) return;
      clearTimeout(viewTimer);
      if (
        visible &&
        document.visibilityState === "visible" &&
        (mediaType !== "google" ||
          element.querySelector('ins[data-ad-status="filled"]'))
      ) {
        viewTimer = setTimeout(
          () => {
            if (document.visibilityState === "visible") {
              viewed = true;
              send.current("view");
            }
          },
          mediaType === "video" ? 2000 : 1000,
        );
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some(
          (e) => e.isIntersecting && e.intersectionRatio >= 0.5,
        );
        observe();
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(element);
    const mutation = new MutationObserver(observe);
    if (mediaType === "google")
      mutation.observe(element, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-ad-status"],
      });
    document.addEventListener("visibilitychange", observe);
    const video = element.querySelector("video");
    let seconds = 0,
      last = 0;
    const milestones = new Set<number>();
    const tick = () => {
      const now = performance.now();
      if (
        video &&
        !video.paused &&
        document.visibilityState === "visible" &&
        last
      )
        seconds += Math.min(2, (now - last) / 1000);
      last = now;
      if (video?.duration) {
        let played = 0;
        for (let i = 0; i < video.played.length; i++)
          played += video.played.end(i) - video.played.start(i);
        for (const mark of [25, 50, 75])
          if (played / video.duration >= mark / 100 && !milestones.has(mark)) {
            milestones.add(mark);
            send.current(("video_" + mark) as MetricEvent["event"]);
          }
      }
    };
    const report = () => {
      if (seconds > 0) {
        send.current("video_seconds", Math.min(seconds, 3600));
        seconds = 0;
      }
    };
    const play = () => {
      last = performance.now();
      send.current("video_start");
    };
    const pause = () => {
      tick();
      report();
      send.current("video_pause");
    };
    const end = () => {
      report();
      send.current("video_complete");
    };
    video?.addEventListener("play", play);
    video?.addEventListener("timeupdate", tick);
    video?.addEventListener("pause", pause);
    video?.addEventListener("ended", end);
    window.addEventListener("pagehide", report);
    return () => {
      clearTimeout(viewTimer);
      observer.disconnect();
      resized.disconnect();
      mutation.disconnect();
      document.removeEventListener("visibilitychange", observe);
      video?.removeEventListener("play", play);
      video?.removeEventListener("timeupdate", tick);
      video?.removeEventListener("pause", pause);
      video?.removeEventListener("ended", end);
      window.removeEventListener("pagehide", report);
      report();
      send.current = () => {};
    };
  }, [context, item, kind, placement, mediaType, demo]);
  function click(event: React.MouseEvent) {
    if (mediaType === "google") return;
    const target = (event.target as Element).closest("a");
    if (
      !target ||
      !target.getAttribute("href") ||
      target.getAttribute("href") === "#"
    )
      return;
    send.current("click");
    if (
      target.classList.contains("creative-cta") ||
      target.dataset.adCta !== undefined
    )
      send.current("cta");
    flush();
  }
  return (
    <div
      ref={node}
      className="ad-metrics-wrapper"
      data-metric-item={item}
      data-metric-kind={kind}
      onClickCapture={click}
      onAuxClickCapture={(event) => {
        if (event.button === 1) click(event);
      }}
    >
      {children}
    </div>
  );
}
