import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
export const slugSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use letras minúsculas, números e hífens.",
  );
export const imageSchema = z.union([
  z.literal(""),
  z.url().refine((s) => {
    const u = new URL(s);
    return (
      u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
    );
  }, "Use HTTPS"),
]);
export const linkSchema = z
  .string()
  .max(2000)
  .refine(
    (s) =>
      s === "" ||
      (s.startsWith("/") && !s.startsWith("//")) ||
      s.startsWith("https://"),
    "Use URL HTTPS ou caminho local",
  );
export const settingsSchema = z.object({
  logo: imageSchema,
  favicon: imageSchema,
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  font: z.enum(["sans", "serif"]),
  description: text(300),
  footer: text(1000),
  header: text(100),
  socials: z.array(z.object({ label: text(60), url: linkSchema })).max(12),
  menus: z.array(z.object({ label: text(60), url: linkSchema })).max(15),
  menusMode: z.enum(["auto","custom"]).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  surfaceColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  tagline: text(160).optional(),
  whatsappUrl: linkSchema.optional(),
  whatsappText: text(200).optional(),
  videoUrl: z
    .union([
      z.literal(""),
      z.url().refine((s) => {
        const u = new URL(s);
        return (
          u.protocol === "https:" &&
          [
            "youtube.com",
            "www.youtube.com",
            "youtu.be",
            "www.youtube-nocookie.com",
          ].includes(u.hostname)
        );
      }, "Use um vídeo do YouTube."),
    ])
    .optional(),
  videoTitle: text(200).optional(),
  videosLink: linkSchema.optional(),
  newsletterTitle: text(160).optional(),
  newsletterText: text(300).optional(),
  newsletterEnabled: z.boolean().optional(),
  contactTitle: text(160).optional(),
  contactEnabled: z.boolean().optional(),
  privacyUrl: linkSchema.optional(),
  contactEmail: z.union([z.literal(""), z.email()]).optional(),
  contactPhone: text(50).optional(),
  commercialEmail: z.union([z.literal(""), z.email()]).optional(),
  commercialPhone: text(50).optional(),
  commercialText: text(300).optional(),
  socialCards: z
    .array(z.object({ label: text(80), image: imageSchema, url: linkSchema }))
    .max(3)
    .optional(),
  seoTitle: text(70).optional(),
  seoDescription: text(180).optional(),
  ogImage: imageSchema.optional(),
});
export const sectionsSchema = z
  .array(
    z.object({
      id: z.uuid(),
      type: z.enum([
        "lead",
        "sponsored",
        "latest",
        "featured",
        "category",
        "banner",
        "text",
        "image",
      ]),
      title: text(120),
      categoryId: z.uuid().optional().or(z.literal("")),
      articleIds: z.array(z.uuid()).max(12).optional(),
      text: text(5000).optional(),
      image: imageSchema.optional(),
      link: linkSchema.optional(),
      layout: z.enum(["news", "magazine"]).optional(),
      position: z
        .enum([
          "header",
          "sidebar",
          "footer",
          "between",
          "category",
          "sponsored",
        ])
        .optional(),
      sponsorColor: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .optional(),
      sponsorName: text(100).optional(),
      sponsorLogo: imageSchema.optional(),
      sponsorLink: linkSchema.optional(),
    }),
  )
  .max(30);
export const articleSchema = z
  .object({
    title: text(200).min(1),
    slug: slugSchema,
    subtitle: text(400),
    content: z.string().max(200000),
    author: text(120),
    cover_url: imageSchema,
    cover_alt: text(300),
    tags: z.array(text(60)).max(20),
    category_id: z.uuid().nullable(),
    seo_title: text(70),
    seo_description: text(180),
    status: z.enum(["draft", "published", "scheduled"]),
    publish_at: z.iso.datetime().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "draft" && !v.publish_at)
      ctx.addIssue({
        code: "custom",
        message: "Informe a data de publicação.",
      });
  });
export const domainSchema = z
  .string()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Informe apenas o domínio, sem https ou caminho.",
  );
