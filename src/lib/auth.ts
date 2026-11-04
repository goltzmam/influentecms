import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireAccess() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  await client.rpc("claim_portal_invitations");
  const member = await client
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (member.error)
    throw new Error("Não foi possível confirmar seu acesso. Tente novamente.");
  if (member.data)
    return {
      client,
      user,
      membership: member.data,
      isOwner: true,
      portalIds: [] as string[],
    };
  const grants = await client
    .from("portal_editors")
    .select("organization_id,portal_id")
    .eq("user_id", user.id);
  if (grants.error || !grants.data?.length) redirect("/login?error=access");
  return {
    client,
    user,
    membership: {
      organization_id: grants.data[0].organization_id,
      organizations: null,
    },
    isOwner: false,
    portalIds: grants.data.map((g) => g.portal_id),
  };
}
export async function requireAdmin() {
  const access = await requireAccess();
  if (!access.isOwner) redirect("/painel");
  return access;
}
