import type { Category, Section, Settings } from "./types";
export const templates = {
  classic: {
    name: "Influente News",
    color: "#6324dc",
    accentColor: "#d5ff00",
    tagline: "Notícia por onde você passa.",
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
  template: "classic" | "modern",
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
      "Seja notícia no site, redes sociais e nos painéis de LED. Anuncie com a Influente Mídia.",
    ...s,
  };
}
export function referenceSections(categories: Category[]): Section[] {
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
  const blocks: Section[] = [lead, sponsored];
  [...categories].sort((a,b)=>{const rank=(s:string)=>s==="politica"?0:s==="entretenimento"?1:2;return rank(a.slug)-rank(b.slug);}).slice(0, 2).forEach((c, i) => {
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
