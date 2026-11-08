import type { Experience } from "./experience.ts";
import type { Settings } from "./types.ts";
export const widgetKinds = [
  "contact",
  "newsletter",
  "commercial",
  "search",
] as const;
export type WidgetKind = (typeof widgetKinds)[number];
export const widgetNames: Record<WidgetKind, string> = {
  contact: "Formulário",
  newsletter: "Novidades por e-mail",
  commercial: "Chamada comercial",
  search: "Busca",
};
export function widgetEnabled(settings: Settings, kind: WidgetKind) {
  const c = settings.experience?.[kind];
  if (c?.enabled === false) return false;
  if (kind === "contact" && c?.contentType !== "image")
    return settings.experience?.contact?.mode !== "hidden";
  return true;
}
export function widgetPosition(
  experience: Experience,
  kind: WidgetKind,
  sections: string[] = [],
  home = true,
) {
  const c = experience[kind],
    fallback =
      kind === "contact"
        ? "community"
        : kind === "newsletter"
          ? "before-footer"
          : kind === "commercial"
            ? "footer"
            : "header";
  const position =
    !c?.position || c.position === "default" ? fallback : c.position;
  if (position === "before-section" || position === "after-section")
    return home && c?.sectionId && sections.includes(c.sectionId)
      ? position
      : "after-content";
  return position;
}

// Old appearance fields and the visual inspector share the same saved copy.
export function reconcileLegacyWidgets(
  previous: Settings,
  incoming: Experience,
  legacy: Partial<Settings>,
): Experience {
  const next = { ...incoming };
  const sync = (
    kind: WidgetKind,
    key: string,
    oldValue: unknown,
    newValue: unknown,
  ) => {
    if (newValue === oldValue) return;
    const previousValue = (
      previous.experience?.[kind] as Record<string, unknown> | undefined
    )?.[key];
    const posted = (next[kind] as Record<string, unknown> | undefined)?.[key];
    if (posted === undefined || posted === previousValue || posted === oldValue)
      next[kind] = { ...next[kind], [key]: newValue } as never;
  };
  sync("commercial", "body", previous.commercialText, legacy.commercialText);
  sync("contact", "title", previous.contactTitle, legacy.contactTitle);
  sync(
    "contact",
    "enabled",
    previous.contactEnabled ?? true,
    legacy.contactEnabled,
  );
  sync("newsletter", "title", previous.newsletterTitle, legacy.newsletterTitle);
  sync(
    "newsletter",
    "showForm",
    previous.newsletterEnabled ?? true,
    legacy.newsletterEnabled,
  );
  return next;
}

export function widgetReaderFlags(s: Settings) {
  const c = s.experience?.contact,
    n = s.experience?.newsletter;
  return {
    contactEnabled:
      (c?.enabled ?? s.contactEnabled ?? true) &&
      c?.mode !== "hidden" &&
      c?.contentType !== "image",
    newsletterEnabled:
      (n?.enabled ?? s.newsletterEnabled ?? true) &&
      (n?.showForm ?? s.newsletterEnabled ?? true) &&
      n?.contentType !== "image",
  };
}
