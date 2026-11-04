import { createHmac, randomBytes } from "node:crypto";
import { sameOrigin } from "@/lib/security";
import { getPublicPortal } from "@/lib/public";
import { serviceClient } from "@/lib/supabase/service";
import { jsonBody } from "@/lib/ai/access";
import { metricBatchSchema, isAutomatedAgent } from "@/lib/metrics/schema";
const fallback = randomBytes(32).toString("hex");
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (process.env.VERCEL_ENV === "preview")
    return new Response(null, { status: 204 });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    isAutomatedAgent(request.headers.get("user-agent") || "")
  )
    return new Response(null, { status: 204 });
  try {
    const input = metricBatchSchema.safeParse(await jsonBody(request, 18000));
    if (!input.success) return new Response(null, { status: 400 });
    const { slug } = await params,
      portal = await getPublicPortal(slug);
    const secret = process.env.ANALYTICS_HASH_SECRET || fallback;
    const hash = (value: string) =>
      createHmac("sha256", secret)
        .update(portal.id + ":" + value)
        .digest("hex");
    const ip = (request.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();
    const events = input.data.events.map((event) => ({
      ...event,
      visitor: hash(event.visitor),
      session: hash(event.session),
    }));
    const client = await serviceClient();
    const result = await client.rpc("record_ad_events", {
      p_portal: portal.id,
      p_ip: hash(ip),
      p_events: events,
    });
    if (result.error) return new Response(null, { status: 503 });
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 400 });
  }
}
