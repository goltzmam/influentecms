import Link from "next/link";
import { Globe2, Plus, ArrowUpRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
export default async function Dashboard() {
  const { client, membership } = await requireAdmin();
  const [{ data: portals, error }, { count, error: countError }] =
    await Promise.all([
      client
        .from("portals")
        .select("id,name,slug,template,settings")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false }),
      client
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id),
    ]);
  if (error || countError)
    throw new Error(
      "Não foi possível carregar o dashboard. Aplique as migrations.",
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SUA CENTRAL EDITORIAL</p>
          <h1>
            Uma boa história começa aqui<span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            Seus portais, suas publicações. Tudo em um só lugar.
          </p>
        </div>
        <Button asChild>
          <Link href="/painel/novo">
            <Plus size={17} />
            Criar portal
          </Link>
        </Button>
      </div>
      <div className="stats">
        <article>
          <span>Portais</span>
          <strong>{portals?.length || 0}</strong>
          <small>Espaços de publicação independentes</small>
        </article>
        <article>
          <span>Notícias</span>
          <strong>{count || 0}</strong>
          <small>Publicações e rascunhos da organização</small>
        </article>
      </div>
      <div className="section-title">
        <h2>
          Seus portais <span className="count">{portals?.length || 0}</span>
        </h2>
        <span className="muted">Sua rede de comunicação</span>
      </div>
      {portals?.length ? (
        <div className="portal-grid">
          {portals.map((p) => (
            <Link
              href={`/painel/${p.id}`}
              className="portal portal-card"
              key={p.id}
            >
              <div
                className={`portal-cover ${p.template}`}
                style={{ backgroundColor: p.settings?.color || "#285c45" }}
              >
                <Globe2 size={36} />
                <span>
                  {p.template === "classic"
                    ? "INFLUENTE NEWS"
                    : "REVISTA INFLUENTE"}
                </span>
              </div>
              <div className="portal-info">
                <h3>{p.name}</h3>
                <p className="muted">{p.slug}</p>
                <span>
                  Administrar portal <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Globe2 size={28} />
          </div>
          <h3>Seu próximo portal começa aqui</h3>
          <p>
            Escolha um template, dê um nome e prepare sua primeira publicação.
          </p>
          <Button asChild>
            <Link href="/painel/novo">Criar meu primeiro portal</Link>
          </Button>
        </div>
      )}
    </>
  );
}
