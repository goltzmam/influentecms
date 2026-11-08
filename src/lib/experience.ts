import { z } from "zod";
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const text = (n: number) => z.string().trim().max(n);
const url = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      !v ||
      (v.startsWith("/") && !v.startsWith("//")) ||
      v.startsWith("https://"),
    "Use um endereço HTTPS ou uma página do portal.",
  );
const image = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      !v ||
      v.startsWith("https://") ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(v),
    "Use uma imagem segura.",
  );
export const videoUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return (
        u.protocol === "https:" &&
        ([
          "youtube.com",
          "www.youtube.com",
          "youtu.be",
          "www.youtube-nocookie.com",
        ].includes(u.hostname) ||
          /\.(mp4|webm)$/i.test(u.pathname))
      );
    } catch {
      return false;
    }
  }, "Use um vídeo do YouTube ou um arquivo MP4/WebM seguro.");
export const widgetPlacementSchema = z.object({
  enabled: z.boolean().optional(),
  position: z
    .enum([
      "default",
      "header",
      "before-content",
      "after-content",
      "before-section",
      "after-section",
      "before-footer",
      "footer",
    ])
    .optional(),
  sectionId: z.union([z.uuid(), z.literal("")]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  maxWidth: z.number().int().min(200).max(1600).optional(),
  background: hex.optional(),
  color: hex.optional(),
  radius: z.number().int().min(0).max(80).optional(),
  padding: z.number().int().min(0).max(100).optional(),
  image: image.optional(),
  imageLink: url.optional(),
  imageAlt: text(200).optional(),
  contentType: z.enum(["content", "image"]).optional(),
});
const leaf = z.object({
  label: text(80).min(1, "Dê um nome a cada item do menu."),
  url,
});
const branch = leaf.extend({ children: z.array(leaf).max(12).optional() });
export const menuSchema = leaf.extend({
  children: z.array(branch).max(12).optional(),
});
export type MenuItem = z.infer<typeof menuSchema>;
export const experienceSchema = z
  .object({
    navigation: z
      .object({
        showLogo: z.boolean().optional(),
        logo: image.optional(),
        logoWidth: z.number().int().min(50).max(600).optional(),
        enabled: z.boolean().optional(),
        inlineStyle: z.enum(["row", "distributed", "columns"]).optional(),
        density: z.enum(["compact", "comfortable"]).optional(),
        shrinkOnScroll: z.boolean().optional(),
        headerHeight: z.number().int().min(64).max(140).optional(),
        compactHeight: z.number().int().min(48).max(88).optional(),
        showTagline: z.boolean().optional(),
        menuLabel: text(40).optional(),
        customColors: z.boolean().optional(),
        layout: z
          .enum(["horizontal", "burger", "sidebar", "hybrid", "hidden"])
          .optional(),
        background: hex.optional(),
        color: hex.optional(),
        accent: hex.optional(),
        width: z.number().int().min(240).max(500).optional(),
        logoAlign: z.enum(["left", "center"]).optional(),
        sticky: z.boolean().optional(),
      })
      .optional(),
    contact: widgetPlacementSchema
      .extend({
        title: text(160).optional(),
        mode: z.enum(["inline", "compact", "drawer", "hidden"]).optional(),
        maxWidth: z.number().int().min(280).max(1200).optional(),
        columns: z.enum(["one", "two"]).optional(),
        background: hex.optional(),
        color: hex.optional(),
        buttonColor: hex.optional(),
        radius: z.number().int().min(0).max(40).optional(),
        padding: z.number().int().min(8).max(64).optional(),
        messageRows: z.number().int().min(2).max(12).optional(),
        buttonLabel: text(80).optional(),
        intro: text(400).optional(),
        nameLabel: text(80).optional(),
        emailLabel: text(80).optional(),
        phoneLabel: text(80).optional(),
        subjectLabel: text(80).optional(),
        messageLabel: text(80).optional(),
        messagePlaceholder: text(300).optional(),
        consentText: text(500).optional(),
        fields: z
          .array(
            z.enum(["address", "neighborhood", "phone", "subject", "kind"]),
          )
          .max(5)
          .optional(),
      })
      .optional(),
    footer: z
      .object({
        layout: z.enum(["columns", "centered", "minimal"]).optional(),
        background: hex.optional(),
        color: hex.optional(),
        columns: z.number().int().min(1).max(4).optional(),
        logo: image.optional(),
        logoWidth: z.number().int().min(50).max(600).optional(),
        showLogo: z.boolean().optional(),
        showMenu: z.boolean().optional(),
        showCommercial: z.boolean().optional(),
        showSocials: z.boolean().optional(),
        showSearch: z.boolean().optional(),
        showRss: z.boolean().optional(),
        copyright: text(300).optional(),
        menus: z.array(menuSchema).max(15).optional(),
        advertImage: image.optional(),
        advertVideo: videoUrl.optional(),
        advertLink: url.optional(),
        advertTitle: text(120).optional(),
        advertBackground: hex.optional(),
        advertColor: hex.optional(),
      })
      .optional(),
    search: widgetPlacementSchema
      .extend({
        preset: z.enum(["outline", "filled", "minimal", "pill", "card"]).optional(),
        buttonMode: z.enum(["text", "icon", "both"]).optional(),
        layout: z.enum(["inline", "stacked"]).optional(),
        title: text(120).optional(),
        description: text(300).optional(),
        customStyle: z.boolean().optional(),
        placeholder: text(200).optional(),
        buttonLabel: text(80).optional(),
        buttonColor: hex.optional(),
        buttonTextColor: hex.optional(),
        inputBackground: hex.optional(),
        inputColor: hex.optional(),
        inputBorder: hex.optional(),
        height: z.number().int().min(30).max(90).optional(),
      })
      .optional(),
    newsletter: widgetPlacementSchema
      .extend({
        title: text(160).optional(),
        description: text(500).optional(),
        placeholder: text(200).optional(),
        buttonLabel: text(80).optional(),
        consentText: text(500).optional(),
        buttonColor: hex.optional(),
        buttonTextColor: hex.optional(),
        inputBackground: hex.optional(),
        inputColor: hex.optional(),
        showForm: z.boolean().optional(),
        showWhatsapp: z.boolean().optional(),
      })
      .optional(),
    commercial: widgetPlacementSchema
      .extend({
        title: text(160).optional(),
        body: text(2000).optional(),
        buttonLabel: text(100).optional(),
        link: url.optional(),
        video: videoUrl.optional(),
        showContacts: z.boolean().optional(),
      })
      .optional(),
    partners: z
      .object({
        title: text(100).optional(),
        subtitle: text(300).optional(),
        layout: z.enum(["logos", "cards", "showcase"]).optional(),
        columns: z.number().int().min(2).max(6).optional(),
        background: hex.optional(),
        color: hex.optional(),
        cardBackground: hex.optional(),
        radius: z.number().int().min(0).max(40).optional(),
        imageFit: z.enum(["contain", "cover"]).optional(),
        showNames: z.boolean().optional(),
      })
      .optional(),
  })
  .default({});
export type Experience = z.infer<typeof experienceSchema>;
export type PageContext = {
  kind: "home" | "article" | "category" | "page" | "search";
  slug?: string;
  categoryId?: string;
};
export const creativeSchema = z
  .object({
    demo: z.boolean().optional(),
    source: z.enum(["flue", "slot"]).optional(),
    investment: z.number().min(0).max(100000000).optional(),
    mediaType: z.enum(["image", "video", "text", "google"]).default("image"),
    googlePublisherId: z
      .string()
      .regex(/^(?:ca-pub-\d{16})?$/)
      .optional(),
    googleSlot: z
      .string()
      .regex(/^\d{0,20}$/)
      .optional(),
    videoUrl: videoUrl.optional(),
    description: text(1000).optional(),
    cta: text(80).optional(),
    alt: text(300).optional(),
    format: z
      .enum([
        "auto",
        "billboard",
        "leaderboard",
        "rectangle",
        "skyscraper",
        "square",
        "native",
        "custom",
      ])
      .default("auto"),
    width: z.number().int().min(100).max(2500).optional(),
    height: z.number().int().min(50).max(2000).optional(),
    fit: z.enum(["contain", "cover"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    background: hex.optional(),
    color: hex.optional(),
    radius: z.number().int().min(0).max(40).optional(),
    pageKinds: z
      .array(z.enum(["home", "article", "category", "page", "search"]))
      .max(5)
      .optional(),
    pageSlugs: z.array(text(120)).max(30).optional(),
    categoryIds: z.array(z.uuid()).max(30).optional(),
    sectionIds: z.array(z.uuid()).max(30).optional(),
    sectionPlacement: z.enum(["before", "after"]).optional(),
    device: z.enum(["all", "desktop", "mobile"]).optional(),
    repeatEvery: z.number().int().min(0).max(20).optional(),
    order: z.number().int().min(0).max(999).optional(),
  })
  .default({ mediaType: "image", format: "auto" });
export type Creative = z.infer<typeof creativeSchema>;
export const sectionStyleSchema = {
  titleColor: hex.optional(),
  titleBackground: hex.optional(),
  copyColor: hex.optional(),
  cardBackground: hex.optional(),
  titleSize: z.number().int().min(14).max(72).optional(),
  copySize: z.number().int().min(12).max(36).optional(),
  radius: z.number().int().min(0).max(40).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
};
export function campaignMatches(
  creative: Partial<Creative> | undefined,
  context: PageContext,
) {
  if (!creative) return true;
  if (creative.pageKinds?.length && !creative.pageKinds.includes(context.kind))
    return false;
  const prefix =
    context.kind === "article"
      ? "noticia"
      : context.kind === "page"
        ? "pagina"
        : context.kind === "category"
          ? "categoria"
          : context.kind === "search"
            ? "busca"
            : "";
  if (
    creative.pageSlugs?.length &&
    !creative.pageSlugs.includes(context.slug || "") &&
    !creative.pageSlugs.includes(
      prefix ? `/${prefix}/${context.slug || ""}` : "/",
    )
  )
    return false;
  if (
    creative.categoryIds?.length &&
    !creative.categoryIds.includes(context.categoryId || "")
  )
    return false;
  return true;
}
