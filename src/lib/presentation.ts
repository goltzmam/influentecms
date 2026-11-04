import type { Category, Section, Settings } from "./types";
export const templates = {
  classic: {
    name: "Influente News",
    color: "#6324dc",
    accentColor: "#d5ff00",
    tagline: "Notícia por onde você passa.",
  },
  daily: {
    name: "Jornal Diário",
    color: "#c4170c",
    accentColor: "#ffd166",
    tagline: "Informação que faz parte do seu dia.",
  },
  modern: {
    name: "Revista Influente",
    color: "#6324dc",
    accentColor: "#d5ff00",
    tagline: "Histórias, ideias e pessoas que influenciam.",
  },
} as const;
export function presentationSettings(
  s: Settings,
  template: "classic" | "modern" | "daily",
): Settings {
  return {
    ...templates[template],
    surfaceColor: "#ffffff",
    textColor: "#21152e",
    font: template === "modern" ? "serif" : "sans",
    whatsappText:
      "Notícia por onde você passa, você também vê no WhatsApp. Clique!",
    newsletterTitle: "Receba novidades por e-mail",
    newsletterText: "Saiba primeiro pelo grupo e canal do WhatsApp",
    contactTitle: "Fale com a redação",
    contactEnabled: true,
    newsletterEnabled: true,
    commercialText:
      "Conecte sua marca a quem acompanha nossa publicação. Conheça nossos formatos e fale com a equipe.",
    ...s,
    experience: {
      navigation: {
        layout: template === "daily" ? "burger" : "horizontal",
        background: s.color || templates[template].color,
        color: "#ffffff",
        logoAlign: template === "classic" ? "left" : "center",
        ...s.experience?.navigation,
        customColors:
          s.experience?.navigation?.customColors ??
          Boolean(
            s.experience?.navigation?.background ||
            s.experience?.navigation?.color ||
            s.experience?.navigation?.accent,
          ),
      },
      contact: {
        mode: "compact",
        maxWidth: 640,
        columns: "two",
        background: "#ffffff",
        color: "#17342a",
        buttonColor: s.color || templates[template].color,
        radius: 16,
        padding: 24,
        messageRows: 3,
        fields: ["phone", "subject"],
        ...s.experience?.contact,
      },
      footer: {
        layout: "columns",
        background:
          template === "modern"
            ? "#f4f1ec"
            : template === "daily"
              ? s.color || templates[template].color
              : "#12241e",
        color: template === "modern" ? "#21152e" : "#ffffff",
        columns: 4,
        showLogo: true,
        showSocials: true,
        showRss: true,
        advertBackground: s.accentColor || templates[template].accentColor,
        advertColor: s.color || templates[template].color,
        ...s.experience?.footer,
      },
      partners: {
        title: "Quem caminha com a gente",
        layout: "cards",
        columns: 4,
        background: "#f5f8f6",
        color: "#17342a",
        cardBackground: "#ffffff",
        radius: 16,
        imageFit: "contain",
        showNames: true,
        ...s.experience?.partners,
      },
    },
  };
}
export function referenceSections(
  categories: Category[],
  template: "classic" | "modern" | "daily" = "classic",
): Section[] {
  const lead: Section = {
    id: "10000000-0000-4000-8000-000000000001",
    type: "lead",
    title: "",
  };
  const sponsored: Section = {
    id: "10000000-0000-4000-8000-000000000002",
    type: "sponsored",
    title: "Publieditorial",
  };
  const banner: Section = {
    id: "10000000-0000-4000-8000-000000000003",
    type: "banner",
    title: "",
    position: "between",
  };
  if (template === "daily")
    return [
      lead,
      { ...banner, position: "header" },
      {
        id: "10000000-0000-4000-8000-000000000004",
        type: "latest",
        title: "Últimas notícias",
      },
    ];
  if (template === "modern")
    return [
      lead,
      {
        id: "10000000-0000-4000-8000-000000000004",
        type: "latest",
        title: "Novas histórias",
      },
      banner,
      ...categories
        .slice(0, 3)
        .map((c) => ({
          id: c.id,
          type: "category" as const,
          title: c.name,
          categoryId: c.id,
          layout: "magazine" as const,
          position: "category" as const,
        })),
      sponsored,
    ];
  const blocks: Section[] = [lead, sponsored];
  [...categories]
    .sort((a, b) => {
      const rank = (s: string) =>
        s === "politica" ? 0 : s === "entretenimento" ? 1 : 2;
      return rank(a.slug) - rank(b.slug);
    })
    .slice(0, 2)
    .forEach((c, i) => {
      blocks.push({
        id: c.id,
        type: "category",
        title: c.name,
        categoryId: c.id,
        layout: i === 0 ? "news" : "magazine",
        position: "category",
      });
      if (i === 0) blocks.push(banner);
    });
  return blocks;
}
export function youtubeEmbed(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "";
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : [
              "youtube.com",
              "www.youtube.com",
              "www.youtube-nocookie.com",
            ].includes(u.hostname)
          ? u.searchParams.get("v") ||
            u.pathname.split("/").filter(Boolean).at(-1) ||
            ""
          : "";
    return /^[a-zA-Z0-9_-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : "";
  } catch {
    return "";
  }
}
