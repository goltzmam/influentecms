import { createServerClient } from "@supabase/ssr";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-portal-host");
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const baseDomain = (process.env.PORTAL_BASE_DOMAIN || "").toLowerCase();
  const appHost = new URL(process.env.APP_URL || "http://localhost:3000")
    .hostname;
  const primary =
    host === appHost ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === process.env.VERCEL_URL ||
    host.endsWith(".vercel.app");
  if (!primary && url && key) {
    const client = createPublicClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let slug: string | undefined;
    if (baseDomain && host.endsWith(`.${baseDomain}`)) {
      const candidate = host.slice(0, -baseDomain.length - 1);
      if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate)) slug = candidate;
    } else {
      const { data, error } = await client
        .from("domains")
        .select("portal_id")
        .eq("hostname", host)
        .eq("verified", true)
        .maybeSingle();
      if (error)
        return new NextResponse("Portal indisponível", { status: 503 });
      if (data) {
        const { data: portal } = await client
          .from("portals")
          .select("slug")
          .eq("id", data.portal_id)
          .single();
        slug = portal?.slug;
      }
    }
    if (!slug)
      return new NextResponse("Domínio não configurado", { status: 404 });
    const target = request.nextUrl.clone();
    target.pathname = `/p/${slug}${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
    requestHeaders.set("x-portal-host", host);
    return NextResponse.rewrite(target, {
      request: { headers: requestHeaders },
    });
  }
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (
    url &&
    key &&
    (request.nextUrl.pathname.startsWith("/painel") ||
      request.nextUrl.pathname === "/login")
  ) {
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    await client.auth.getUser();
  }
  return response;
}
export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
