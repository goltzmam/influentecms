"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
export async function deletePortal(
  _previous: { error: string },
  form: FormData,
) {
  const { client, membership } = await requireAdmin();
  const input = z
    .object({ portal_id: z.uuid(), confirmation: z.string().min(1).max(120) })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return { error: "Digite o nome do portal para confirmar." };
  const portal = await client
    .from("portals")
    .select("id,name")
    .eq("id", input.data.portal_id)
    .eq("organization_id", membership.organization_id)
    .single();
  if (portal.error || !portal.data)
    return { error: "Portal não encontrado ou acesso não autorizado." };
  if (input.data.confirmation !== portal.data.name)
    return { error: "O nome informado não corresponde ao portal." };
  // The registry retains domains and releases their portal binding atomically on delete.
  const removed = await client
    .from("portals")
    .delete()
    .eq("id", portal.data.id)
    .eq("organization_id", membership.organization_id)
    .eq("name", input.data.confirmation)
    .select("id");
  if (removed.error || removed.data?.length !== 1)
    return {
      error:
        "Não foi possível excluir o portal. Atualize a página e tente novamente.",
    };
  // Owner storage policies remain valid after the portal row is removed. Only this prefix is touched.
  const prefix = `${membership.organization_id}/${portal.data.id}`;
  let cleaned = true;
  try {
    for (let batch = 0; batch < 100; batch++) {
      const files = await client.storage
        .from("portal-media")
        .list(prefix, { limit: 1000 });
      if (files.error) throw files.error;
      const paths = (files.data || [])
        .filter((f) => f.id)
        .map((f) => `${prefix}/${f.name}`);
      if (!paths.length) break;
      const result = await client.storage.from("portal-media").remove(paths);
      if (result.error) throw result.error;
      if (batch === 99) cleaned = false;
    }
  } catch {
    cleaned = false;
  }
  revalidatePath("/", "layout");
  redirect(
    `/painel?notice=${encodeURIComponent(cleaned ? "Portal excluído com sucesso." : "Portal excluído. A limpeza de alguns arquivos não foi concluída.")}`,
  );
}
