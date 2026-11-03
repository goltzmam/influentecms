import { requirePortal } from "@/lib/portal";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ portalId: string }> },
) {
  const { portalId } = await params;
  const { client } = await requirePortal(portalId);
  const contacts =
    new URL(request.url).searchParams.get("tipo") === "mensagens";
  const table = contacts ? "portal_contacts" : "portal_subscribers";
  const columns = contacts
    ? [
        "name",
        "email",
        "phone",
        "address",
        "neighborhood",
        "subject",
        "kind",
        "message",
        "created_at",
      ]
    : ["email", "created_at"];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await client
      .from(table)
      .select(columns.join(","))
      .eq("portal_id", portalId)
      .order("created_at")
      .range(i, i + 999);
    if (error) return new Response("Exportação indisponível", { status: 503 });
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < 1000) break;
  }
  const csv = (v: unknown) => {
    let s = String(v ?? "");
    if (/^(?:\s*[=+@-]|[\t\r\n])/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return new Response(
    "\uFEFF" +
      [
        columns.join(","),
        ...rows.map((row) => columns.map((c) => csv(row[c])).join(",")),
      ].join("\r\n"),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${contacts ? "mensagens" : "inscricoes"}.csv"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
