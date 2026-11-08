import { portalUrl } from "./portal-url";
import { notFound } from "next/navigation";
import { requireAccess } from "./auth";
import type { Portal } from "./types";
export async function requirePortal(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const auth = await requireAccess();
  if (!auth.isOwner && !auth.portalIds.includes(id)) notFound();
  const { data, error } = await auth.client
    .from("portals")
    .select(
      "id,organization_id,name,slug,template,settings,home_published,created_at",
    )
    .eq("id", id)
    .single();
  if (
    error ||
    !data ||
    (auth.isOwner && data.organization_id !== auth.membership.organization_id)
  )
    notFound();
  const domains = await auth.client
    .from("domains")
    .select("hostname,verified,portal_id")
    .eq("portal_id", id)
    .eq("verified", true)
    .order("created_at")
    .order("hostname")
    .limit(1);
  if (domains.error)
    throw new Error("Não foi possível carregar o endereço do portal.");
  return {
    ...auth,
    portal: data as Portal,
    publicUrl: portalUrl(data, domains.data || []),
  };
}
