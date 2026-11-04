"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requirePortal } from "@/lib/portal";
import { mailDeliveryStatus } from "@/lib/mail-delivery";
import { mailDeliveryMessage } from "@/lib/mail-errors";
import { confirmationLink } from "@/lib/access-link";
import { serviceClient } from "@/lib/supabase/service";
export async function inviteEditor(form: FormData) {
  const auth = await requirePortal(String(form.get("portal_id")));
  if (!auth.isOwner) redirect(`/painel/${auth.portal.id}`);
  let message = "";
  try {
    const email = z
      .email()
      .max(254)
      .parse(
        String(form.get("email") || "")
          .trim()
          .toLowerCase(),
      );
    const row = await auth.client
      .from("portal_editors")
      .insert({
        organization_id: auth.portal.organization_id,
        portal_id: auth.portal.id,
        email,
      })
      .select("id")
      .single();
    if (row.error && row.error.code !== "23505")
      throw new Error("Não foi possível adicionar o editor. Tente novamente.");
    const readiness = await mailDeliveryStatus();
    if (readiness.state === "limited")
      throw new Error(
        "Editor salvo. O envio automático de e-mails ainda precisa ser ativado. Use Copiar convite para compartilhar o acesso.",
      );
    const service = await serviceClient();
    const origin = process.env.APP_URL || "http://localhost:3000";
    const invited = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/painel/${auth.portal.id}`,
    });
    if (invited.error) {
      if (
        ["email_exists", "user_already_exists"].includes(
          invited.error.code || "",
        )
      ) {
        const sender = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, flowType: "implicit" } },
        );
        const sent = await sender.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${origin}/auth/callback?next=/painel/${auth.portal.id}`,
          },
        });
        if (sent.error) {
          console.warn(
            JSON.stringify({
              event: "editor_email_delivery",
              code: sent.error.code || "unknown",
              status: sent.error.status,
            }),
          );
          throw new Error(
            mailDeliveryMessage(sent.error.code, sent.error.status),
          );
        }
      } else {
        console.warn(
          JSON.stringify({
            event: "editor_email_delivery",
            code: invited.error.code || "unknown",
            status: invited.error.status,
          }),
        );
        throw new Error(
          mailDeliveryMessage(invited.error.code, invited.error.status),
        );
      }
    }
    message =
      "Editor adicionado. Enviamos um link de acesso por e-mail, sem necessidade de senha.";
  } catch (error) {
    message =
      error instanceof z.ZodError
        ? "Informe um e-mail válido."
        : error instanceof Error && !error.message.startsWith("CMS:")
          ? error.message
          : "Não foi possível enviar o convite. Tente novamente.";
  }
  revalidatePath(`/painel/${auth.portal.id}/equipe`);
  redirect(
    `/painel/${auth.portal.id}/equipe?notice=${encodeURIComponent(message)}`,
  );
}
export async function removeEditor(form: FormData) {
  const auth = await requirePortal(String(form.get("portal_id")));
  if (!auth.isOwner) redirect(`/painel/${auth.portal.id}`);
  const id = z.uuid().parse(form.get("id"));
  await auth.client
    .from("portal_editors")
    .delete()
    .eq("id", id)
    .eq("portal_id", auth.portal.id);
  revalidatePath("/painel", "layout");
  redirect(`/painel/${auth.portal.id}/equipe?notice=Editor%20removido.`);
}
export async function editorAccessLink(
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const auth = await requirePortal(String(form.get("portal_id")));
  if (!auth.isOwner)
    return { error: "Somente o administrador pode criar convites." };
  const email = z.email().parse(
    String(form.get("email") || "")
      .trim()
      .toLowerCase(),
  );
  const row = await auth.client
    .from("portal_editors")
    .select("id")
    .eq("portal_id", auth.portal.id)
    .eq("email", email)
    .single();
  if (row.error) return { error: "Editor não encontrado." };
  try {
    const service = await serviceClient();
    const redirectTo = `${process.env.APP_URL || "http://localhost:3000"}/auth/callback?next=/painel/${auth.portal.id}`;
    let generated = await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    if (generated.error)
      generated = await service.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
    if (generated.error || !generated.data.properties?.hashed_token)
      return { error: "Não foi possível criar o convite. Tente novamente." };
    return {
      url: confirmationLink(
        process.env.APP_URL || "http://localhost:3000",
        generated.data.properties.hashed_token,
        generated.data.properties.verification_type,
        `/painel/${auth.portal.id}`,
      ),
    };
  } catch {
    return { error: "Não foi possível criar o convite. Tente novamente." };
  }
}
