import sanitizeHtml from "sanitize-html";
export function cleanHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "s",
      "u",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "iframe",
      "hr",
      "pre",
      "code",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
      iframe: ["src", "width", "height", "allowfullscreen"],
    },
    allowedSchemes: ["https", "http"],
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com"],
    transformTags: {
      a: (_, attrs) => ({
        tagName: "a",
        attribs: {
          ...attrs,
          href: safeLink(attrs.href || ""),
          rel: "noopener noreferrer",
        },
      }),
      img: (_, attrs) => ({
        tagName: "img",
        attribs: { ...attrs, src: safeLink(attrs.src || "") },
      }),
    },
  });
}
export const escapeXml = (s: string) =>
  s.replace(
    /[<>&'\"]/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[c] ?? c,
  );
import { safeLink } from "./links.ts";
export { safeLink } from "./links.ts";

export function isLive(
  status: string,
  publishAt: string | null,
  now = Date.now(),
) {
  return (
    ["published", "scheduled"].includes(status) &&
    !!publishAt &&
    new Date(publishAt).getTime() <= now
  );
}

// Split only at balanced top-level elements, keeping sanitized markup intact.
export function splitArticleContent(value: string): [string, string] {
  const html = cleanHtml(value),
    boundaries: number[] = [];
  let depth = 0;
  const voids = new Set(["br", "hr", "img"]);
  for (const match of html.matchAll(/<\/?([a-z0-9]+)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    if (voids.has(tag)) continue;
    if (match[0].startsWith("</")) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) boundaries.push(match.index + match[0].length);
    } else depth++;
  }
  const point =
    boundaries[Math.max(0, Math.floor(boundaries.length / 2) - 1)] ||
    html.length;
  return [html.slice(0, point), html.slice(point)];
}
