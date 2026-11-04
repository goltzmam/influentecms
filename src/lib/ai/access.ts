import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";
export class ApiFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiOwner(request: Request, mutate = false) {
  if (mutate && !sameOrigin(request))
    throw new ApiFailure(403, "Origem da requisição não permitida.");
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new ApiFailure(401, "Entre no painel para continuar.");
  const member = await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (member.error || !member.data)
    throw new ApiFailure(403, "Acesso exclusivo ao proprietário.");
  return { client, user, organizationId: member.data.organization_id };
}
export async function jsonBody(request: Request, maxBytes = 350000) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiFailure(400, "Envie os dados do projeto.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ApiFailure(413, "O projeto ultrapassou o limite permitido.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiFailure(400, "Os dados enviados são inválidos.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiFailure)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      error:
        "Não foi possível concluir. Confira a conexão e a configuração do servidor.",
    },
    { status: 500 },
  );
}
