import "server-only";
type DeliveryStatus = { state: "ready" | "limited" | "unknown" };
let cached: { status: DeliveryStatus; until: number } | undefined;
export async function mailDeliveryStatus(): Promise<DeliveryStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    return { state: "ready" };
  if (cached && cached.until > Date.now()) return cached.status;
  if (!url || !process.env.SUPABASE_ACCESS_TOKEN) return { state: "unknown" };
  try {
    const ref = new URL(url).hostname.split(".")[0];
    const r = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/config/auth`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!r.ok) return { state: "unknown" };
    const config = await r.json();
    const status: DeliveryStatus = {
      state: config.smtp_host ? "ready" : "limited",
    };
    cached = { status, until: Date.now() + 60000 };
    return status;
  } catch {
    return { state: "unknown" };
  }
}
