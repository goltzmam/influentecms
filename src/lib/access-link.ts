export function accessDestination(value: string | null | undefined) {
  return value && /^\/painel(?:\/[a-z0-9-]+)*$/.test(value) ? value : "/painel";
}
export function confirmationLink(
  origin: string,
  token: string,
  type: string,
  next = "/painel",
) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", accessDestination(next));
  url.hash = new URLSearchParams({ token_hash: token, type }).toString();
  return url.toString();
}
export function readAccessLink(href: string) {
  const url = new URL(href),
    query = url.searchParams,
    hash = new URLSearchParams(url.hash.slice(1));
  const value = (name: string) => hash.get(name) || query.get(name) || "";
  const next = accessDestination(query.get("next"));
  const providerError = value("error_code") || value("error");
  const token = value("token_hash"),
    type = value("type"),
    code = value("code"),
    access = value("access_token"),
    refresh = value("refresh_token");
  const payload =
    token && ["invite", "magiclink", "email"].includes(type)
      ? { token_hash: token, type, next }
      : code
        ? { code, next }
        : access && refresh
          ? { access_token: access, refresh_token: refresh, next }
          : null;
  return { payload, providerError, next };
}
