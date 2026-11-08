import "server-only";
export class DomainConnectionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super("CMS:" + message);
  }
}
export async function vercel(
  path: string,
  options: {
    method?: string;
    body?: string;
    allow404?: boolean;
    allowPendingVerification?: boolean;
  } = {},
) {
  const token = process.env.VERCEL_API_TOKEN,
    project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project)
    throw new DomainConnectionError(
      "connection_setup",
      "Domínio salvo. A conexão automática precisa ser ativada pelo responsável pela plataforma.",
    );
  const endpoint = new URL(path, "https://api.vercel.com");
  if (process.env.VERCEL_TEAM_ID)
    endpoint.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  const response = await fetch(endpoint, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404 && options.allow404) return null;
  if (
    response.status === 400 &&
    options.allowPendingVerification &&
    endpoint.pathname.endsWith("/verify")
  )
    return null;
  if (response.status === 401 || response.status === 403)
    throw new DomainConnectionError(
      "connection_access",
      "A conexão de domínios precisa de uma atualização pelo responsável pela plataforma. Seu domínio continua salvo.",
    );
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const code = String(details?.error?.code || "");
    if (
      response.status === 409 ||
      (response.status === 400 &&
        /domain_already|domain_in_use|domain_taken|not_owned/i.test(code))
    )
      throw new DomainConnectionError(
        "domain_conflict",
        "Este domínio está associado a outro site. Remova o vínculo anterior para conectá-lo aqui.",
      );
    if (response.status === 429)
      throw new DomainConnectionError(
        "connection_busy",
        "A verificação está ocupada. A conexão será consultada novamente em instantes.",
      );
    throw new DomainConnectionError(
      "connection_temporary",
      "Não foi possível verificar o endereço agora. Seus dados estão salvos; tentaremos novamente.",
    );
  }
  if (response.status === 204) return {};
  return response.json();
}
