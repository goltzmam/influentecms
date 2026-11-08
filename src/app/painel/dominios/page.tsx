import Link from "next/link";
import { Globe2, Plus, Link2, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { readerMessage } from "@/lib/messages";
import { DomainConnection } from "@/components/domain-connection";
import { DomainAssignment } from "@/components/domain-assignment";
import { SubmitButton } from "@/components/submit-button";
import { DeleteButton } from "@/components/delete-button";
import {
  registerDomain,
  removeRegisteredDomain,
  releaseDomain,
} from "../domain-actions";
export const maxDuration = 300;
export default async function Domains({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { client, membership } = await requireAdmin();
  const { notice } = await searchParams;
  const [domains, portals] = await Promise.all([
    client
      .from("domains")
      .select("id,hostname,portal_id,verified,provider_status")
      .eq("organization_id", membership.organization_id)
      .order("created_at"),
    client
      .from("portals")
      .select("id,name,slug")
      .eq("organization_id", membership.organization_id)
      .order("name"),
  ]);
  if (domains.error || portals.error)
    throw new Error("Não foi possível carregar a central de domínios.");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ENDEREÇOS DA SUA REDE</p>
          <h1>Central de domínios</h1>
          <p className="muted">
            Cadastre uma vez. Escolha o portal. Troque o vínculo quando
            precisar.
          </p>
        </div>
        <a href="#cadastrar-dominio" className="button">
          <Plus size={16} />
          Adicionar domínio
        </a>
      </div>
      {notice && (
        <p role="status" className="notice">
          {readerMessage(notice)}
        </p>
      )}
      <div className="stats domain-registry-stats">
        <article>
          <span>
            <Globe2 size={16} />
            Seus domínios
          </span>
          <strong>{domains.data.length}</strong>
          <small>Endereços cadastrados</small>
        </article>
        <article>
          <span>
            <Link2 size={16} />
            Disponíveis
          </span>
          <strong>{domains.data.filter((d) => !d.portal_id).length}</strong>
          <small>Prontos para escolher em um novo portal</small>
        </article>
        <article>
          <span>
            <CheckCircle2 size={16} />
            DNS confirmado
          </span>
          <strong>{domains.data.filter((d) => d.verified).length}</strong>
          <small>Conexão verificada oficialmente</small>
        </article>
      </div>
      <div className="editor-grid domain-registry">
        <div>
          {!domains.data.length && (
            <section className="empty-state">
              <Globe2 size={30} />
              <h2>Um endereço para cada projeto</h2>
              <p>
                Adicione seus domínios e acompanhe a conexão por aqui. Depois,
                escolha qual portal cada endereço vai abrir.
              </p>
            </section>
          )}
          {domains.data.map((d) => {
            const portal = portals.data.find((p) => p.id === d.portal_id);
            return (
              <article className="panel registry-domain-card" key={d.id}>
                <div className="section-title">
                  <h2>{d.hostname}</h2>
                  <span className="badge">
                    {portal ? "Vinculado" : "Disponível"}
                  </span>
                </div>
                {portal ? (
                  <p className="field-hint">
                    Portal atual:{" "}
                    <Link href={`/painel/${portal.id}`}>{portal.name} →</Link>
                  </p>
                ) : (
                  <p className="field-hint">
                    Este domínio pode ser escolhido ao criar um portal.
                  </p>
                )}
                <DomainConnection
                  initial={d}
                  portalId={d.portal_id || undefined}
                  enabled={Boolean(process.env.VERCEL_API_TOKEN)}
                />
                <DomainAssignment
                  id={d.id}
                  current={d.portal_id}
                  portals={portals.data}
                />
                <div className="registry-domain-actions">
                  {d.verified && portal && (
                    <a
                      href={`https://${d.hostname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="button button-outline"
                    >
                      Abrir portal ↗
                    </a>
                  )}
                  {portal ? (
                    <form action={releaseDomain}>
                      <input type="hidden" name="domain_id" value={d.id} />
                      <button className="button button-outline">
                        Desvincular e disponibilizar
                      </button>
                    </form>
                  ) : (
                    <form action={removeRegisteredDomain}>
                      <input type="hidden" name="domain_id" value={d.id} />
                      <DeleteButton />
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <aside>
          <form
            action={registerDomain}
            className="panel"
            id="cadastrar-dominio"
          >
            <h2>Adicionar domínio</h2>
            <label>
              Seu domínio
              <input
                type="text"
                name="hostname"
                placeholder="meuportal.com.br"
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            </label>
            <p className="field-hint">
              Use um domínio que pertence a você. Você receberá os registros
              para copiar no local onde comprou o endereço.
            </p>
            <SubmitButton>Cadastrar domínio</SubmitButton>
          </form>
          <section className="panel domain-guide">
            <h2>Como conectar</h2>
            <ol>
              <li>Adicione seu domínio.</li>
              <li>Copie os registros de DNS indicados.</li>
              <li>Salve os registros no provedor do domínio.</li>
              <li>Vincule o endereço ao portal desejado.</li>
            </ol>
            <p className="field-hint">
              Não altere registros de e-mail (MX). Durante a propagação, o
              endereço provisório do portal continua disponível.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
