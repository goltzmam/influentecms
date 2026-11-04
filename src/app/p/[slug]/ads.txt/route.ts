import { getPublicPortal } from "@/lib/public";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const portal = await getPublicPortal(slug),
    ads = portal.settings.advertising;
  if (!ads?.enabled || !/^ca-pub-\d{16}$/.test(ads.publisherId || ""))
    return new Response("", { status: 404 });
  return new Response(
    `google.com, ${ads.publisherId!.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    },
  );
}
