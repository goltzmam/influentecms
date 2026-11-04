import "server-only";
export async function vercel(
  path: string,
  options: { method?: string; body?: string; allow404?: boolean } = {},
) {
  const token = process.env.VERCEL_API_TOKEN,
    project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project)
    throw new Error(
      "CMS:Domínio salvo. A conexão automática precisa ser ativada pelo responsável pela plataforma.",
    );
  const query = process.env.VERCEL_TEAM_ID
    ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`
    : "";
  const response = await fetch(`https://api.vercel.com${path}${query}`, {
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
  if (!response.ok)
    throw new Error(
      `CMS:Não foi possível conectar o endereço agora. Confira se ele já está associado a outro site e tente novamente.`,
    );
  if (response.status === 204) return {};
  return response.json();
}
