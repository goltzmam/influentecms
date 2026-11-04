import { loadMetricReport, MetricInputError } from "@/lib/metrics/report";
import { metricPdf } from "@/lib/metrics/pdf";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ portalId: string }> },
) {
  const { portalId } = await params;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  let data;
  try {
    data = await loadMetricReport(portalId, query);
  } catch (error) {
    if (error instanceof MetricInputError)
      return new Response(error.message, { status: 400 });
    throw error;
  }
  const bytes = await metricPdf(data);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="metricas-${data.portal.slug}-${data.filters.from}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
