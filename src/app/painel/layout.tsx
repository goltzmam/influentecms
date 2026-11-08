import Link from "next/link";
import { portalUrl } from "@/lib/portal-url";
import { requireAccess } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminNav } from "@/components/admin-nav";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client, user, membership, isOwner, portalIds } =
    await requireAccess();
  let portalsQuery = client
    .from("portals")
    .select("id,name,slug")
    .order("name");
  portalsQuery = isOwner
    ? portalsQuery.eq("organization_id", membership.organization_id)
    : portalsQuery.in("id", portalIds);
  const { data, error } = await portalsQuery;
  if (error) throw new Error("Não foi possível carregar os portais.");
  let domainsQuery = client
    .from("domains")
    .select("hostname,portal_id,verified")
    .eq("verified", true)
    .order("created_at")
    .order("hostname");
  domainsQuery = isOwner
    ? domainsQuery.eq("organization_id", membership.organization_id)
    : domainsQuery.in("portal_id", portalIds);
  const domains = await domainsQuery;
  if (domains.error) throw new Error("Não foi possível carregar os endereços.");
  const addressPortals = (data || []).map((p) => ({
    ...p,
    url: portalUrl(p, domains.data || []),
  }));
  return (
    <AdminShell
      email={user.email || ""}
      isOwner={isOwner}
      sidebar={
        <>
          <Link className="brand" href="/painel">
            <span className="brand-emblem">i</span>
            <span className="brand-wordmark">
              influente<small>CMS · CENTRAL EDITORIAL</small>
            </span>
          </Link>
          <AdminNav portals={addressPortals} isOwner={isOwner} />
          <div className="sidebar-footer">
            <span className="status-dot" />
            Workspace privado
            <form action="/auth/signout" method="post">
              <button className="logout">Sair da conta</button>
            </form>
          </div>
        </>
      }
    >
      {children}
    </AdminShell>
  );
}
