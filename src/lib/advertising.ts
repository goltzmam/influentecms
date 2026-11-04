import { z } from "zod";
export const adFormats = {
  billboard: [970, 250],
  leaderboard: [728, 90],
  rectangle: [300, 250],
  skyscraper: [300, 600],
  square: [300, 300],
  native: [600, 200],
  sponsor: [240, 90],
} as const;
export const advertisingSchema = z
  .object({
    enabled: z.boolean().optional(),
    publisherId: z
      .string()
      .regex(
        /^(?:ca-pub-\d{16})?$/,
        "Informe um identificador ca-pub com 16 dígitos.",
      )
      .optional(),
    autoAds: z.boolean().optional(),
  })
  .refine(
    (value) =>
      !value.enabled || /^ca-pub-\d{16}$/.test(value.publisherId || ""),
    "Informe o identificador da sua conta para ativar o Google AdSense.",
  )
  .default({});
export type Advertising = z.infer<typeof advertisingSchema>;
export const adSlotSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["advertising", "google", "sponsor"]),
  zone: z.enum(["before", "sidebar", "heading", "after"]),
  format: z.enum([
    "billboard",
    "leaderboard",
    "rectangle",
    "skyscraper",
    "square",
    "native",
    "sponsor",
    "custom",
  ]),
  campaignId: z.union([z.uuid(), z.literal("")]).optional(),
  googleSlot: z
    .string()
    .regex(/^\d{0,20}$/)
    .optional(),
  width: z.number().int().min(100).max(2500).optional(),
  height: z.number().int().min(50).max(2000).optional(),
  responsive: z.boolean().optional(),
  device: z.enum(["all", "desktop", "mobile"]).optional(),
  background: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  showEmpty: z.boolean().optional(),
  demo: z.boolean().optional(),
  enabled: z.boolean().optional(),
});
export type AdSlot = z.infer<typeof adSlotSchema>;
export function parseGoogleAdCode(code: string) {
  if (code.length > 12000)
    throw new Error(
      "O código é grande demais. Cole somente o bloco do AdSense.",
    );
  const scripts = [
    ...code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi),
  ];
  if (/\bon\w+\s*=|javascript:|<iframe|<object|<embed/i.test(code))
    throw new Error("Use somente o código oficial do Google AdSense.");
  for (const [, attrs, body] of scripts) {
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) {
      let u: URL;
      try {
        u = new URL(src.replaceAll("&amp;", "&"));
      } catch {
        throw new Error("Endereço do script inválido.");
      }
      if (
        u.protocol !== "https:" ||
        u.hostname !== "pagead2.googlesyndication.com" ||
        u.pathname !== "/pagead/js/adsbygoogle.js" ||
        body.trim()
      )
        throw new Error("Use somente o script oficial do Google AdSense.");
    } else {
      const compact = body.replace(/\s+/g, "");
      if (
        !/^\(?adsbygoogle=window\.adsbygoogle\|\|\[\]\)?\.push\(\{\}\);?$/.test(
          compact,
        )
      )
        throw new Error("Use somente o código oficial de um bloco do AdSense.");
    }
  }
  const publisherId = code.match(/ca-pub-\d{16}(?!\d)/)?.[0];
  if (!publisherId)
    throw new Error("Não encontramos o identificador da sua conta no código.");
  return {
    publisherId,
    slot: code.match(/data-ad-slot\s*=\s*["'](\d{1,20})["']/i)?.[1] || "",
  };
}
export function referenceAdSlots(type: string, id: string): AdSlot[] {
  const make = (
    suffix: number,
    kind: AdSlot["kind"],
    zone: AdSlot["zone"],
    format: AdSlot["format"],
  ): AdSlot => ({
    id: `20000000-0000-4000-8000-${id.replaceAll("-", "").slice(-10)}${suffix.toString().padStart(2, "0")}`,
    kind,
    zone,
    format,
  });
  if (type === "lead")
    return [
      make(3, "advertising", "before", "leaderboard"),
      make(1, "google", "sidebar", "rectangle"),
      make(2, "advertising", "sidebar", "skyscraper"),
    ];
  if (type === "category")
    return [
      make(1, "sponsor", "heading", "sponsor"),
      make(2, "advertising", "sidebar", "square"),
    ];
  if (type === "banner") return [make(1, "google", "after", "leaderboard")];
  return [];
}
