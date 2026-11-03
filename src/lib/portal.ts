import { notFound } from "next/navigation";
import { requireAdmin } from "./auth";
import type { Portal } from "./types";
export async function requirePortal(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const auth = await requireAdmin();
  const { data, error } = await auth.client
    .from("portals")
    .select(
      "id,organization_id,name,slug,template,settings,home_published,created_at",
    )
    .eq("id", id)
    .eq("organization_id", auth.membership.organization_id)
    .single();
  if (error || !data) notFound();
  return { ...auth, portal: data as Portal };
}
