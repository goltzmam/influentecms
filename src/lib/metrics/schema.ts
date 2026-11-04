import { z } from "zod";
export const metricEventSchema = z.object({
  id: z.uuid(),
  item: z.uuid(),
  kind: z.enum(["campaign", "partner"]),
  event: z.enum([
    "served",
    "view",
    "click",
    "cta",
    "video_start",
    "video_25",
    "video_50",
    "video_75",
    "video_complete",
    "video_pause",
    "video_seconds",
  ]),
  visitor: z.uuid(),
  session: z.uuid(),
  pageView: z.uuid(),
  placement: z
    .string()
    .max(100)
    .regex(/^[a-zA-Z0-9_:\/-]+$/),
  path: z
    .string()
    .max(300)
    .refine(
      (v) =>
        v.startsWith("/") &&
        !v.startsWith("//") &&
        !v.includes("?") &&
        !v.includes("#"),
    ),
  source: z
    .string()
    .max(120)
    .regex(/^(?:direto|interno|[a-zA-Z0-9.-]+)$/),
  device: z.enum(["desktop", "mobile", "tablet"]),
  value: z.number().min(0).max(3600).default(0),
});
export const metricBatchSchema = z.object({
  events: z.array(metricEventSchema).min(1).max(12),
});
export type MetricEvent = z.infer<typeof metricEventSchema>;
export function isAutomatedAgent(value: string) {
  return /bot\b|crawler|spider|facebookexternalhit|lighthouse|pagespeed|preview|slackbot|whatsapp/i.test(
    value,
  );
}
