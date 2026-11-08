import { referenceAdSlots } from "../advertising.ts";
import {
  experienceSchema,
  menuSchema,
  sectionStyleSchema,
  videoUrl,
} from "../experience.ts";
import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const slug = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const referenceUrl = z
  .string()
  .url()
  .max(1500)
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        u.port === "" &&
        u.hostname.includes(".") &&
        !/^[\d.]+$/.test(u.hostname) &&
        !u.hostname.includes(":") &&
        !/(^|\.)(localhost|local|internal|test|lan|home)$/.test(u.hostname) &&
        ![...u.searchParams.keys()].some((k) =>
          /^(token|access_token|api_key|password|secret)$/i.test(k),
        )
      );
    } catch {
      return false;
    }
  }, "Informe um endereço HTTPS público, sem login ou credenciais.");
export const briefSchema = z.object({
  brief: text(5000).min(20, "Descreva o portal com pelo menos 20 caracteres."),
  references: z.array(referenceUrl).max(3),
  requireReferences: z.boolean().default(true),
  referenceImages: z
    .array(
      z.object({
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z
          .string()
          .min(20)
          .max(1400000)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      }),
    )
    .max(3)
    .default([]),
});
export const blueprintShape = z.object({
  clone: z.object({
    url: referenceUrl,
    documentId: z.uuid().optional(),
    logo: z.string().max(2000),
    favicon: z.string().max(2000),
    socials: z.array(z.string().max(2000)).max(6),
    covers: z.record(z.string(), z.string().max(2000)),
    report: z.array(text(300)).max(20),
  }).optional(),
  name: text(120).min(1),
  slug,
  template: z.enum(["classic", "modern", "daily"]),
  rationale: text(1200),
  includeWelcome: z.boolean().optional(),
  design: experienceSchema.optional(),
  menus: z.array(menuSchema).max(15).optional(),
  identity: z.object({
    color,
    accentColor: color,
    surfaceColor: color,
    textColor: color,
    font: z.enum(["sans", "serif"]),
    tagline: text(160),
    description: text(300),
    seoTitle: text(70),
    seoDescription: text(180),
    welcomeTitle: text(120),
    welcomeText: text(1800),
    footer: text(1000),
  }),
  categories: z
    .array(z.object({ name: text(100).min(1), slug }))
    .min(2)
    .max(8),
  sections: z
    .array(
      z.object({
        type: z.enum([
          "lead",
          "latest",
          "category",
          "banner",
          "text",
          "video",
          "image",
          "sponsored",
          "featured",
        ]),
        ...sectionStyleSchema,
        backgroundColor: color.optional(),
        textColor: color.optional(),
        padding: z.number().int().min(0).max(80).optional(),
        layoutWidth: z.enum(["full", "half", "third"]).optional(),
        adFormat: z
          .enum([
            "billboard",
            "leaderboard",
            "rectangle",
            "skyscraper",
            "square",
            "native",
          ])
          .optional(),
        videoUrl: videoUrl.optional(),
        image: z
          .string()
          .max(2000)
          .refine((v) => !v || v.startsWith("https://"))
          .optional(),
        link: z
          .string()
          .max(2000)
          .refine(
            (v) =>
              !v ||
              v.startsWith("https://") ||
              (v.startsWith("/") && !v.startsWith("//")),
          )
          .optional(),
        title: text(120),
        categorySlug: z.string().max(63),
        text: text(5000),
        layout: z.enum(["news", "magazine"]),
        position: z.enum([
          "header",
          "sidebar",
          "footer",
          "between",
          "category",
          "sponsored",
        ]),
      }),
    )
    .min(3)
    .max(16),
  pages: z
    .array(
      z.object({ title: text(160).min(1), slug, body: text(12000).min(20) }),
    )
    .min(1)
    .max(5),
  articles: z
    .array(
      z.object({
        imagePrompt: text(800).optional(),
        title: text(200).min(1),
        slug,
        subtitle: text(400),
        body: text(16000).min(80),
        categorySlug: slug,
        tags: z.array(text(60)).max(8),
        seoTitle: text(70),
        seoDescription: text(180),
      }),
    )
    .min(1)
    .max(6),
});
export const blueprintSchema = blueprintShape.superRefine((plan, ctx) => {
  const categories = new Set(plan.categories.map((c) => c.slug));
  for (const [name, values] of [
    ["categorias", plan.categories],
    ["páginas", plan.pages],
    ["textos", plan.articles],
  ] as const)
    if (new Set(values.map((v) => v.slug)).size !== values.length)
      ctx.addIssue({
        code: "custom",
        message: `Há slugs repetidos em ${name}.`,
      });
  if (!plan.sections.some((s) => s.type === "lead" || s.type === "latest"))
    ctx.addIssue({
      code: "custom",
      message: "O portal precisa de uma seção de notícias.",
    });
  for (const section of plan.sections)
    if (section.type === "category" && !categories.has(section.categorySlug))
      ctx.addIssue({
        code: "custom",
        message: "Uma seção aponta para categoria inexistente.",
      });
  for (const article of plan.articles)
    if (!categories.has(article.categorySlug))
      ctx.addIssue({
        code: "custom",
        message: "Um texto aponta para categoria inexistente.",
      });
});
export type AiBlueprint = z.infer<typeof blueprintShape>;
export const editsSchema = z.object({
  name: text(120).min(1),
  slug,
  template: z.enum(["classic", "modern", "daily"]),
  color,
  accentColor: color,
  surfaceColor: color,
  textColor: color,
  tagline: text(160),
});
export function personalize(
  plan: AiBlueprint,
  edits: z.infer<typeof editsSchema>,
): AiBlueprint {
  const replace = (s: string) =>
    plan.name === edits.name ? s : s.split(plan.name).join(edits.name);
  return blueprintSchema.parse({
    ...plan,
    name: edits.name,
    slug: edits.slug,
    template: edits.template,
    identity: {
      ...plan.identity,
      ...edits,
      seoTitle: replace(plan.identity.seoTitle),
      description: replace(plan.identity.description),
      seoDescription: replace(plan.identity.seoDescription),
      welcomeTitle: replace(plan.identity.welcomeTitle),
      welcomeText: replace(plan.identity.welcomeText),
      footer: replace(plan.identity.footer),
    },
    pages: plan.pages.map((p) => ({
      ...p,
      body: replace(p.body),
      title: replace(p.title),
    })),
    articles: plan.articles.map((a) => ({ ...a, body: replace(a.body) })),
  });
}
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function paragraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}
export function creationPayload(input: AiBlueprint) {
  const plan = blueprintSchema.parse(input),
    i = plan.identity;
  return {
    name: plan.name,
    slug: plan.slug,
    template: plan.template,
    settings: {
      ...(plan.clone?.documentId ? {cloneDocumentId:plan.clone.documentId} : {}),
      experience: {
        contact: {
          mode: "compact",
          maxWidth: 640,
          fields: ["phone", "subject"],
          ...plan.design?.contact,
        },
        ...plan.design,
      },
      color: i.color,
      accentColor: i.accentColor,
      surfaceColor: i.surfaceColor,
      textColor: i.textColor,
      font: i.font,
      tagline: i.tagline,
      description: i.description,
      seoTitle: i.seoTitle,
      seoDescription: i.seoDescription,
      footer: i.footer,
      header: "",
      menusMode: plan.menus?.length ? "custom" : "auto",
      menus: plan.menus?.length
        ? plan.menus
        : plan.pages
            .filter(
              (p) =>
                !["privacidade", "termos", "politica-de-privacidade"].includes(
                  p.slug,
                ),
            )
            .map((p) => ({ label: p.title, url: `/pagina/${p.slug}` })),
      socials: plan.clone?.socials.map(url => ({label: new URL(url).hostname.replace(/^www\./,""),url})) || [],
      socialCards: [],
      contactEnabled: true,
      newsletterEnabled: true,
      contactTitle: "Fale com a redação",
      newsletterTitle: "Receba novidades por e-mail",
      commercialText: `Anuncie no ${plan.name}. Entre em contato com a redação.`,
      logo: "",
      favicon: "",
      ogImage: "",
    },
    categories: plan.categories,
    sections: [
      ...(plan.includeWelcome !== false
        ? [
            {
              type: "text",
              title: i.welcomeTitle,
              text: i.welcomeText,
              categorySlug: "",
              layout: "news",
              position: "header",
            },
          ]
        : []),
      ...plan.sections.map((section, index) => ({
        ...section,
        adSlots: plan.clone ? [] : referenceAdSlots(
          section.type,
          `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        ),
      })),
    ],
    pages: plan.pages.map((p) => ({
      ...p,
      content: paragraphs(p.body),
      published: !["privacidade", "termos", "politica-de-privacidade"].includes(
        p.slug,
      ),
    })),
    articles: plan.articles.map((a) => ({
      ...a,
      content: paragraphs(a.body),
      author: "Redação",
      cover_url: "",
      cover_alt: "Ilustração editorial gerada para o portal.",
    })),
  };
}
