import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireAdmin() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: membership, error: accessError } = await client
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();
  if (accessError)
    throw new Error("Não foi possível verificar sua autorização.");
  if (!membership) redirect("/login?error=access");
  return { client, user, membership };
}
