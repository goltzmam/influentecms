import type { Experience, MenuItem, Creative } from "./experience";
export type Settings = {
  logo?: string;
  favicon?: string;
  color?: string;
  font?: string;
  description?: string;
  footer?: string;
  header?: string;
  socials?: { label: string; url: string }[];
  menus?: MenuItem[];
  experience?: Experience;
  menusMode?: "auto" | "custom";
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
  tagline?: string;
  whatsappUrl?: string;
  whatsappText?: string;
  videoUrl?: string;
  videoTitle?: string;
  videosLink?: string;
  newsletterTitle?: string;
  newsletterText?: string;
  newsletterEnabled?: boolean;
  contactTitle?: string;
  contactEnabled?: boolean;
  privacyUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  commercialEmail?: string;
  commercialPhone?: string;
  commercialText?: string;
  socialCards?: { label: string; image: string; url: string }[];
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
};
export type Section = {
  id: string;
  type:
    | "lead"
    | "latest"
    | "featured"
    | "category"
    | "sponsored"
    | "banner"
    | "text"
    | "image"
    | "video";
  title: string;
  videoUrl?: string;
  layoutWidth?: "full" | "half" | "third";
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  adFormat?:
    | "billboard"
    | "leaderboard"
    | "rectangle"
    | "skyscraper"
    | "square"
    | "native";
  campaignId?: string;
  titleColor?: string;
  titleBackground?: string;
  copyColor?: string;
  cardBackground?: string;
  titleSize?: number;
  copySize?: number;
  radius?: number;
  align?: "left" | "center" | "right";
  categoryId?: string;
  articleIds?: string[];
  text?: string;
  image?: string;
  link?: string;
  layout?: "news" | "magazine";
  position?:
    "header" | "sidebar" | "footer" | "between" | "category" | "sponsored";
  sponsorName?: string;
  sponsorColor?: string;
  sponsorLogo?: string;
  sponsorLink?: string;
};
export type Portal = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  template: "classic" | "modern" | "daily";
  settings: Settings;
  home_published: Section[];
  created_at: string;
};
export type Article = {
  id: string;
  portal_id: string;
  title: string;
  slug: string;
  subtitle: string;
  content: string;
  author: string;
  cover_url: string;
  cover_alt: string;
  tags: string[];
  category_id: string | null;
  seo_title: string;
  seo_description: string;
  status: string;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Category = { id: string; name: string; slug: string };
export type Campaign = {
  creative?: Partial<Creative>;
  id: string;
  name: string;
  image_url: string;
  link: string;
  position: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};
export type Partner = {
  creative?: Partial<Creative>;
  id: string;
  name: string;
  image_url: string;
  link: string;
  active: boolean;
};
