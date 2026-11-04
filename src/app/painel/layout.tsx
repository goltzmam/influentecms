import Link from "next/link";
import { requireAccess } from "@/lib/auth";
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
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link className="brand" href="/painel">
          influente<span>●</span>
        </Link>
        <AdminNav portals={data || []} isOwner={isOwner} />
        <div className="sidebar-footer">
          <span className="status-dot" />
          Workspace privado
          <form action="/auth/signout" method="post">
            <button className="logout">Sair da conta</button>
          </form>
        </div>
      </aside>
      <main className="main">
        <header>
          <span>
            Influente Comunicação{" "}
            <span className="muted">/ Central editorial</span>
          </span>
          <span className="user-email">{user.email}</span>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
