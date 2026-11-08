import Link from "next/link";
import { portalUrl } from "@/lib/portal-url";
import {
  Globe2,
  Plus,
  ArrowUpRight,
  Sparkles,
  Newspaper,
  Megaphone,
  Handshake,
} from "lucide-react";
import { PortalDeletion } from "@/components/portal-deletion";
import { readerMessage } from "@/lib/messages";
import { requireAccess } from "@/lib/auth";
import { Button } from "@/components/ui/button";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const { client, membership, isOwner, portalIds } = await requireAccess();
  if (!isOwner) {
    const { redirect } = await import("next/navigation");
    redirect(`/painel/${portalIds[0]}`);
  }
  const [
    { data: portals, error },
    { count, error: countError },
    campaigns,
    partners,
  ] = await Promise.all([
    client
      .from("portals")
      .select("id,name,slug,template,settings")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
    client
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id),
    client
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id),
    client
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id),
  ]);
  if (error || countError || campaigns.error || partners.error)
    throw new Error(
      "Não foi possível carregar o dashboard. Tente novamente em instantes.",
    );
  const domains = await client
    .from("domains")
    .select("hostname,portal_id,verified")
    .eq("organization_id", membership.organization_id)
    .eq("verified", true)
    .order("created_at")
    .order("hostname");
  if (domains.error) throw new Error("Não foi possível carregar os endereços.");
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
      {notice && (
        <p className="notice" role="status">
          {readerMessage(notice)}
        </p>
      )}
      <section className="workspace-hero">
        <div>
          <span className="hero-kicker">
            <Sparkles size={14} /> ESTÚDIO FLUE
          </span>
          <h2>Da sua ideia à próxima grande publicação.</h2>
          <p>
            Crie um portal com a sua identidade e cuide de cada detalhe em um só
            lugar.
          </p>
          <Link href="/painel/ia" className="button">
            Criar com a FLUE <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="hero-editorial-art" aria-hidden="true">
          <span className="art-orbit" />
          <div className="art-browser">
            <i />
            <i />
            <i />
            <div className="art-cover" />
            <div className="art-lines" />
            <div className="art-tiles">
              <span />
              <span />
              <span />
            </div>
          </div>
          <span className="art-caption">Feito para a sua voz.</span>
        </div>
      </section>
      <div className="stats workspace-stats">
        <article>
          <span>
            <Globe2 size={17} /> Portais
          </span>
          <strong>{portals?.length || 0}</strong>
          <small>Espaços de publicação independentes</small>
        </article>
        <article>
          <span>
            <Newspaper size={17} /> Notícias
          </span>
          <strong>{count || 0}</strong>
          <small>Publicações e rascunhos da organização</small>
        </article>
        <article>
          <span>
            <Megaphone size={17} /> Publicidade
          </span>
          <strong>{campaigns.count || 0}</strong>
          <small>Campanhas da sua rede</small>
        </article>
        <article>
          <span>
            <Handshake size={17} /> Parceiros
          </span>
          <strong>{partners.count || 0}</strong>
          <small>Marcas e conexões</small>
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
            <article className="portal portal-card" key={p.id}>
              <Link href={`/painel/${p.id}`} className="portal-card-main">
                <div
                  className={`portal-cover ${p.template}`}
                  style={{ backgroundColor: p.settings?.color || "#285c45" }}
                >
                  <div className="portal-mini-browser" aria-hidden="true">
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                  {p.settings?.logo ? (
                    <img
                      className="portal-card-logo"
                      src={p.settings.logo}
                      alt=""
                    />
                  ) : (
                    <Globe2 size={36} />
                  )}
                  <span>
                    {p.template === "classic"
                      ? "INFLUENTE NEWS"
                      : p.template === "daily"
                        ? "JORNAL DIÁRIO"
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
              <div className="portal-card-footer">
                <a
                  href={portalUrl(p, domains.data || [])}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver portal <ArrowUpRight size={13} />
                </a>
                <PortalDeletion id={p.id} name={p.name} compact />
              </div>
            </article>
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
