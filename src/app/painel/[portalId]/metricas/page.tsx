import { loadMetricReport, MetricInputError } from "@/lib/metrics/report";
import { MetricsDashboard } from "@/components/metrics-dashboard";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ portalId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { portalId } = await params;
  let data,
    notice = "";
  try {
    data = await loadMetricReport(portalId, await searchParams);
  } catch (error) {
    if (!(error instanceof MetricInputError)) throw error;
    notice = error.message;
    data = await loadMetricReport(portalId, {});
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{data.portal.name}</p>
          <h1>Métricas comerciais</h1>
          <p className="muted">Acompanhe cada campanha e cada parceria.</p>
        </div>
      </div>
      {notice && (
        <p className="notice" role="alert">
          {notice}
        </p>
      )}
      <MetricsDashboard data={data} />
    </>
  );
}
