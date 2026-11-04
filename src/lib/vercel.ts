import "server-only";
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
    throw new Error(
      "CMS:Domínio salvo. A conexão automática precisa ser ativada pelo responsável pela plataforma.",
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
    throw new Error(
      "CMS:A conexão de domínios precisa de uma atualização pelo responsável pela plataforma. Seu domínio continua salvo.",
    );
  if (!response.ok)
    throw new Error(
      `CMS:Não foi possível conectar o endereço agora. Confira se ele já está associado a outro site e tente novamente.`,
    );
  if (response.status === 204) return {};
  return response.json();
}
