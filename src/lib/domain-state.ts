export type DomainRecord = { type: string; name: string; value: string };
export type DomainStatus = {
  checked_at?: string;
  last_error?: string;
  misconfigured?: boolean;
  apexName?: string;
  verification?: { type: string; domain: string; value: string }[];
  recommendedCNAME?: { rank: number; value: string }[];
  recommendedIPv4?: { rank: number; value: string[] }[];
};
export type DomainView = {
  id: string;
  hostname: string;
  verified: boolean;
  provider_status: DomainStatus;
};
export function domainRecords(
  hostname: string,
  status: DomainStatus,
): DomainRecord[] {
  const result: DomainRecord[] = (status.verification || []).map((v) => ({
    type: v.type,
    name: v.domain,
    value: v.value,
  }));
  const apex = status.apexName;
  const cnames = [...(status.recommendedCNAME || [])].sort(
    (a, b) => a.rank - b.rank,
  );
  const ipv4 = [...(status.recommendedIPv4 || [])].sort(
    (a, b) => a.rank - b.rank,
  );
  const isApex = apex ? hostname === apex : !hostname.startsWith("www.");
  const name =
    apex && hostname === apex
      ? "@"
      : apex && hostname.endsWith("." + apex)
        ? hostname.slice(0, -apex.length - 1)
        : hostname;
  if (!isApex && cnames[0])
    result.push({ type: "CNAME", name, value: cnames[0].value });
  else if (ipv4[0])
    for (const value of ipv4[0].value) result.push({ type: "A", name, value });
  else if (cnames[0])
    result.push({ type: "CNAME", name, value: cnames[0].value });
  return result;
}
export async function resolveDomain(
  hostname: string,
  project: string,
  api: (
    path: string,
    options?: {
      method?: string;
      body?: string;
      allow404?: boolean;
      allowPendingVerification?: boolean;
    },
  ) => Promise<any>,
) {
  const host = encodeURIComponent(hostname),
    projectPath = encodeURIComponent(project);
  let domain = await api(`/v9/projects/${projectPath}/domains/${host}`, {
    allow404: true,
  });
  if (!domain)
    domain = await api(`/v10/projects/${projectPath}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: hostname }),
    });
  if (domain.name !== hostname || domain.projectId !== project)
    throw new Error(
      "CMS:Este endereço não está associado ao portal. Tente novamente.",
    );
  if (!domain.verified) {
    const verification = await api(
      `/v9/projects/${projectPath}/domains/${host}/verify`,
      { method: "POST", allowPendingVerification: true },
    );
    if (verification) domain = { ...domain, ...verification };
  }
  const config = await api(
    `/v6/domains/${host}/config?projectIdOrName=${projectPath}`,
  );
  return {
    verified:
      domain.name === hostname &&
      domain.projectId === project &&
      domain.verified === true &&
      config.misconfigured === false,
    provider_status: {
      apexName: domain.apexName,
      verification: domain.verification || [],
      misconfigured: config.misconfigured,
      recommendedCNAME: config.recommendedCNAME || [],
      recommendedIPv4: config.recommendedIPv4 || [],
      checked_at: new Date().toISOString(),
    } as DomainStatus,
  };
}
