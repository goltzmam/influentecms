import "server-only";
import { z } from "zod";
import { requirePortal } from "@/lib/portal";
export class MetricInputError extends Error {}
export type Totals = {
  served: number;
  views: number;
  clicks: number;
  cta: number;
  reach: number;
  clickers: number;
  sessions: number;
  video_starts: number;
  video25: number;
  video50: number;
  video75: number;
  completions: number;
  watch_seconds: number;
};
export type Subject = {
  kind: "campaign" | "partner";
  item_id: string;
  name: string;
  served: number;
  views: number;
  clicks: number;
  reach: number;
  demo?: boolean;
  mediaType?: string;
};
export type MetricReport = {
  totals: Totals;
  daily: { day: string; views: number; clicks: number }[];
  dimensions: {
    dimension: string;
    label: string;
    views: number;
    clicks: number;
  }[];
  items: Subject[];
};
export { ratio, placementLabel } from "./utils";
import { ratio } from "./utils";
export async function loadMetricReport(
  portalId: string,
  query: Record<string, string | undefined>,
) {
  const auth = await requirePortal(portalId);
  const today = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10),
    defaultFrom = new Date(Date.now() - 29 * 86400000 - 3 * 3600000)
      .toISOString()
      .slice(0, 10);
  const checked = z
    .object({
      from: z.iso.date(),
      until: z.iso.date(),
      kind: z.enum(["all", "campaign", "partner"]),
      item: z.union([z.uuid(), z.literal("")]),
      investment: z.coerce.number().min(0).max(100000000).optional(),
    })
    .safeParse({
      from: query.from || defaultFrom,
      until: query.until || today,
      kind: query.kind || "all",
      item: query.item || "",
      investment: query.investment || undefined,
    });
  if (!checked.success)
    throw new MetricInputError(
      "Revise as datas, a peça e o investimento informado.",
    );
  const parsed = checked.data;
  const start = new Date(`${parsed.from}T00:00:00-03:00`),
    end = new Date(
      new Date(`${parsed.until}T00:00:00-03:00`).getTime() + 86400000,
    );
  if (end <= start || end.getTime() - start.getTime() > 181 * 86400000)
    throw new MetricInputError("Escolha um período de até 180 dias.");
  const result = await auth.client.rpc("ad_metrics_report", {
    p_portal: portalId,
    p_from: start.toISOString(),
    p_until: end.toISOString(),
    p_kind: parsed.kind === "all" ? null : parsed.kind,
    p_item: parsed.item || null,
  });
  if (result.error)
    throw new Error("Não foi possível consultar as métricas agora.");
  const report = result.data as MetricReport;
  const days = new Map(report.daily.map((d) => [d.day, d]));
  report.daily = Array.from(
    { length: Math.round((end.getTime() - start.getTime()) / 86400000) },
    (_, i) => {
      const day = new Date(
        Date.parse(parsed.from + "T00:00:00Z") + i * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      return days.get(day) || { day, views: 0, clicks: 0 };
    },
  );
  const [campaigns, partners] = await Promise.all([
    auth.client
      .from("campaigns")
      .select("id,name,creative")
      .eq("portal_id", portalId),
    auth.client
      .from("partners")
      .select("id,name,creative")
      .eq("portal_id", portalId),
  ]);
  if (campaigns.error || partners.error)
    throw new Error("Não foi possível consultar as peças.");
  const catalog = [
    ...(campaigns.data || []).map((c) => ({ ...c, kind: "campaign" as const })),
    ...(partners.data || []).map((p) => ({ ...p, kind: "partner" as const })),
  ];
  for (const section of auth.portal.home_published)
    for (const slot of section.adSlots || [])
      if (slot.kind === "google" && slot.googleSlot)
        catalog.push({
          id: slot.id,
          name: "Google AdSense · " + (section.title || section.type),
          kind: "campaign",
          creative: { mediaType: "google", demo: false },
        });
  for (const entry of catalog) {
    if (
      (parsed.kind !== "all" && entry.kind !== parsed.kind) ||
      (parsed.item && entry.id !== parsed.item)
    )
      continue;
    const existing = report.items.find(
      (i) => i.item_id === entry.id && i.kind === entry.kind,
    );
    if (existing) {
      existing.name = entry.name;
      existing.demo = entry.creative?.demo;
      existing.mediaType = entry.creative?.mediaType;
    } else
      report.items.push({
        kind: entry.kind,
        item_id: entry.id,
        name: entry.name,
        views: 0,
        clicks: 0,
        served: 0,
        reach: 0,
        demo: entry.creative?.demo,
        mediaType: entry.creative?.mediaType,
      });
  }
  report.items.sort(
    (a, b) => b.views - a.views || a.name.localeCompare(b.name),
  );
  return {
    portal: auth.portal,
    report,
    filters: parsed,
    catalog: catalog.map((i) => ({ id: i.id, name: i.name, kind: i.kind })),
    ctr: ratio(report.totals.clicks, report.totals.served),
    viewability: ratio(report.totals.views, report.totals.served),
    frequency: ratio(report.totals.views, report.totals.reach),
    cpc:
      parsed.investment !== undefined && report.totals.clicks > 0
        ? parsed.investment / report.totals.clicks
        : null,
    cpm:
      parsed.investment !== undefined && report.totals.served > 0
        ? (parsed.investment / report.totals.served) * 1000
        : null,
  };
}
