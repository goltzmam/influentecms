export function sameOrigin(request: Request) {
  const raw = request.headers.get("origin");
  if (!raw) return false;
  try {
    const origin = new URL(raw);
    const host = request.headers.get("host") || new URL(request.url).host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      new URL(request.url).protocol.replace(":", "");
    return (
      origin.origin === raw &&
      origin.host === host &&
      origin.protocol === `${protocol}:`
    );
  } catch {
    return false;
  }
}
