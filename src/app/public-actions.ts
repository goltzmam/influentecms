"use server";
import { z } from "zod";
import { publicClient } from "@/lib/supabase/public";
export type PublicResult = { ok: boolean; message: string };
export async function contactPortal(
  _: PublicResult,
  form: FormData,
): Promise<PublicResult> {
  const raw = Object.fromEntries(form);
  if (raw.website) return { ok: true, message: "Mensagem registrada." };
  const input = z
    .object({
      portal_id: z.uuid(),
      name: z.string().trim().min(2).max(120),
      email: z.email().max(254),
      phone: z.string().max(50),
      address: z.string().max(300),
      neighborhood: z.string().max(100),
      subject: z.string().trim().min(1).max(160),
      kind: z.enum(["Sugestão", "Elogio", "Crítica", "Outro"]),
      message: z.string().trim().min(10).max(5000),
      consent: z.literal("on"),
    })
    .safeParse(raw);
  if (!input.success)
    return {
      ok: false,
      message:
        "Confira os campos obrigatórios, escreva pelo menos 10 caracteres e aceite o uso dos dados para responder sua mensagem.",
    };
  const i = input.data;
  try {
    const { error } = await publicClient().rpc("submit_portal_contact", {
      p_portal: i.portal_id,
      p_name: i.name,
      p_email: i.email,
      p_phone: i.phone,
      p_address: i.address,
      p_neighborhood: i.neighborhood,
      p_subject: i.subject,
      p_kind: i.kind,
      p_message: i.message,
    });
    if (error)
      return {
        ok: false,
        message:
          "Não foi possível registrar agora. Se você já enviou mensagens, aguarde antes de tentar novamente.",
      };
    return {
      ok: true,
      message:
        "Mensagem registrada. A redação poderá responder pelos dados informados.",
    };
  } catch {
    return {
      ok: false,
      message: "Serviço indisponível. Tente novamente mais tarde.",
    };
  }
}
export async function subscribePortal(
  _: PublicResult,
  form: FormData,
): Promise<PublicResult> {
  if (form.get("website"))
    return { ok: true, message: "Inscrição registrada." };
  const input = z
    .object({
      portal_id: z.uuid(),
      email: z.email().max(254),
      consent: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return {
      ok: false,
      message:
        "Informe um e-mail válido e autorize o recebimento de novidades.",
    };
  try {
    const { error } = await publicClient().rpc("subscribe_portal", {
      p_portal: input.data.portal_id,
      p_email: input.data.email,
    });
    return error
      ? {
          ok: false,
          message: "Não foi possível registrar agora. Tente mais tarde.",
        }
      : {
          ok: true,
          message:
            "Inscrição registrada. Você pode solicitar a remoção à redação.",
        };
  } catch {
    return {
      ok: false,
      message: "Serviço indisponível. Tente novamente mais tarde.",
    };
  }
}
