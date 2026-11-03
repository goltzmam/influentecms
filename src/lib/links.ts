export function safeLink(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
      ? u.href
      : "#";
  } catch {
    return url.startsWith("/") && !url.startsWith("//") ? url : "#";
  }
}
