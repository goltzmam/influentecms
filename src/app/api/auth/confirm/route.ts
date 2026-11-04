import { z } from "zod";
import { sameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { accessDestination } from "@/lib/access-link";
import { jsonBody } from "@/lib/ai/access";
const credentials = z.union([
  z.object({
    token_hash: z.string().min(10).max(2048),
    type: z.enum(["invite", "magiclink", "email"]),
    next: z.string().max(200).optional(),
  }),
  z.object({
    code: z.string().min(10).max(2048),
    next: z.string().max(200).optional(),
  }),
  z.object({
    access_token: z.string().min(10).max(16000),
    refresh_token: z.string().min(10).max(2048),
    next: z.string().max(200).optional(),
  }),
]);
const reply = (body: object, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: "Origem não permitida." }, 403);
  try {
    const input = credentials.safeParse(await jsonBody(request, 22000));
    if (!input.success)
      return reply(
        {
          error:
            "Este link está incompleto. Peça um novo convite à administração.",
        },
        400,
      );
    const client = await createClient(),
      data = input.data;
    const verified =
      "token_hash" in data
        ? await client.auth.verifyOtp({
            token_hash: data.token_hash,
            type: data.type,
          })
        : "code" in data
          ? await client.auth.exchangeCodeForSession(data.code)
          : await client.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
    if (verified.error || !verified.data.session) {
      const code = verified.error?.code;
      const message =
        code === "otp_expired"
          ? "Este link expirou ou já foi usado. Solicite um novo link e use o e-mail mais recente."
          : code === "bad_code_verifier" || code === "flow_state_not_found"
            ? "Abra o link no navegador onde solicitou o acesso ou peça um novo convite."
            : "Não foi possível confirmar este link. Peça um novo convite e use o e-mail mais recente.";
      return reply({ error: message }, 401);
    }
    const claim = await client.rpc("claim_portal_invitations");
    if (claim.error)
      return reply(
        {
          error:
            "Seu e-mail foi confirmado, mas não foi possível abrir o portal. Tente entrar novamente em instantes.",
        },
        503,
      );
    return reply({ next: accessDestination(data.next) });
  } catch {
    return reply(
      {
        error:
          "Não foi possível confirmar agora. Confira sua conexão e tente novamente.",
      },
      503,
    );
  }
}
