import Link from "next/link";
import { AppearanceDetails } from "@/components/appearance-details";
import { presentationSettings } from "@/lib/presentation";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/portal";
import { ArticleForm } from "@/components/article-form";
import { RichEditor } from "@/components/rich-editor";
import { MediaInput } from "@/components/media-input";
import { LinksEditor } from "@/components/links-editor";
import { HomeBuilder } from "@/components/home-builder";
import { DeleteButton } from "@/components/delete-button";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import type {
  Article,
  Category,
  Campaign,
  Partner,
  Section,
} from "@/lib/types";
import {
  saveCategory,
  saveSettings,
  saveCampaign,
  savePartner,
  savePage,
  removeRecord,
  addDomain,
  verifyDomain,
  deleteDomain,
} from "../../actions";
const titles: Record<string, [string, string]> = {
  noticias: ["Notícias", "Da primeira ideia à publicação."],
  categorias: ["Categorias", "Organize a navegação editorial do seu portal."],
  homepage: [
    "Editor da homepage",
    "Uma composição editorial com a sua identidade.",
  ],
  aparencia: ["Personalização", "Cada detalhe conta a sua história."],
  midia: [
    "Biblioteca de mídia",
    "Imagens otimizadas e organizadas por portal.",
  ],
  publicidade: ["Publicidade", "Campanhas e posições sob seu controle."],
  parceiros: ["Parceiros", "Marcas que fazem parte da sua rede."],
  paginas: ["Páginas institucionais", "Dê contexto à sua marca."],
  leitores: [
    "Leitores e contato",
    "Mensagens e inscrições recebidas neste portal.",
  ],
  dominios: ["Domínios", "Um endereço próprio para sua publicação."],
};
function PortalId({ id }: { id: string }) {
  return <input type="hidden" name="portal_id" value={id} />;
}
function Delete({
  id,
  table,
  portalId,
}: {
  id: string;
  table: string;
  portalId: string;
}) {
  return (
    <form action={removeRecord}>
      <PortalId id={portalId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="table" value={table} />
      <DeleteButton />
    </form>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty-state">
      <h3>Nada por aqui, por enquanto</h3>
      <p>{children}</p>
    </div>
  );
}
function check<T>({
  data,
  error,
}: {
  data: T;
  error: unknown;
}): NonNullable<T> {
  if (error)
    throw new Error(
      "Não foi possível carregar os dados. Confira as migrations e a conexão.",
    );
  return (data ?? []) as NonNullable<T>;
}
export default async function PortalAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ portalId: string; section?: string[] }>;
  searchParams: Promise<{ notice?: string; q?: string; status?: string }>;
}) {
  const { portalId, section = [] } = await params;
  const query = await searchParams;
  const { client, portal } = await requirePortal(portalId);
  const key = section[0] || "";
  if (key === "preview") notFound();
  if (key && !titles[key]) notFound();
  const base = `/painel/${portalId}`;
  const heading = titles[key] || [portal.name, "Sua redação, em movimento."];
  let body: React.ReactNode;
  if (!key) {
    const [a, b, c] = await Promise.all([
      client
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", portalId),
      client
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("portal_id", portalId)
        .eq("status", "draft"),
      client
        .from("articles")
        .select("id,title,status,publish_at")
        .eq("portal_id", portalId)
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);
    if (a.error || b.error || c.error)
      throw new Error("Não foi possível carregar as estatísticas.");
    body = (
      <>
        <div className="stats">
          <article>
            <span>Total de notícias</span>
            <strong>{a.count}</strong>
            <small>Todo o acervo editorial</small>
          </article>
          <article>
            <span>Rascunhos</span>
            <strong>{b.count}</strong>
            <small>Histórias em preparação</small>
          </article>
        </div>
        <div className="quick-actions">
          <Link href={`${base}/noticias/nova`}>＋ Escrever notícia</Link>
          <Link href={`${base}/homepage`}>▦ Organizar homepage</Link>
          <Link href={`${base}/aparencia`}>◈ Personalizar portal</Link>
          <Link href={`/p/${portal.slug}`} target="_blank">
            ↗ Abrir portal
          </Link>
        </div>
        <section className="panel">
          <h2>Atividade editorial recente</h2>
          {c.data?.length ? (
            <div className="records">
              {c.data.map((a) => (
                <Link key={a.id} href={`${base}/noticias/${a.id}`}>
                  <strong>{a.title}</strong>
                  <span className={`badge ${a.status}`}>
                    {a.status === "draft"
                      ? "Rascunho"
                      : a.status === "scheduled"
                        ? "Agendada"
                        : "Publicada"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty>Escreva sua primeira notícia e dê vida ao portal.</Empty>
          )}
        </section>
      </>
    );
  } else if (key === "noticias") {
    const categories = check(
      await client
        .from("categories")
        .select("id,name,slug")
        .eq("portal_id", portalId)
        .order("name"),
    ) as Category[];
    if (section[1]) {
      let article: Article | undefined;
      if (section[1] !== "nova") {
        article = check(
          await client
            .from("articles")
            .select("*")
            .eq("portal_id", portalId)
            .eq("id", section[1])
            .single(),
        ) as Article;
        if (!article.id) notFound();
      }
      body = (
        <ArticleForm
          portalId={portalId}
          article={article}
          categories={categories}
        />
      );
    } else {
      let req = client
        .from("articles")
        .select("*")
        .eq("portal_id", portalId)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (
        query.status &&
        ["draft", "published", "scheduled"].includes(query.status)
      )
        req = req.eq("status", query.status);
      if (query.q)
        req = req.ilike("title", `%${query.q.replace(/[%_]/g, "")}%`);
      const articles = check(await req) as Article[];
      body = (
        <>
          <div className="list-toolbar">
            <form className="search-form">
              <input
                name="q"
                placeholder="Buscar notícias…"
                defaultValue={query.q}
              />
              <select
                aria-label="Status"
                name="status"
                defaultValue={query.status || ""}
              >
                <option value="">Todos os status</option>
                <option value="draft">Rascunhos</option>
                <option value="published">Publicadas</option>
                <option value="scheduled">Agendadas</option>
              </select>
              <button>Buscar</button>
            </form>
            <Button asChild>
              <Link href={`${base}/noticias/nova`}>＋ Nova notícia</Link>
            </Button>
          </div>
          {articles.length ? (
            <div className="panel table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Notícia</th>
                    <th>Status</th>
                    <th>Publicação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link
                          className="article-title-link"
                          href={`${base}/noticias/${a.id}`}
                        >
                          {a.title}
                        </Link>
                        <small>{a.author}</small>
                      </td>
                      <td>
                        <span className={`badge ${a.status}`}>
                          {a.status === "draft"
                            ? "Rascunho"
                            : a.status === "scheduled"
                              ? "Agendada"
                              : "Publicada"}
                        </span>
                      </td>
                      <td>
                        {a.publish_at
                          ? new Date(a.publish_at).toLocaleString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })
                          : "—"}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link href={`${base}/noticias/${a.id}`}>Editar</Link>
                          <a
                            href={`${base}/preview/noticia/${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Prévia
                          </a>
                          <Delete
                            id={a.id}
                            table="articles"
                            portalId={portalId}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Crie uma notícia ou ajuste os filtros de busca.</Empty>
          )}
          <p className="field-hint">
            Até 200 resultados recentes por busca. Datas da listagem em
            Brasília; edição do agendamento em UTC.
          </p>
        </>
      );
    }
  } else if (key === "categorias") {
    const categories = check(
      await client
        .from("categories")
        .select("*")
        .eq("portal_id", portalId)
        .order("name"),
    ) as Category[];
    body = (
      <div className="editor-grid">
        <section className="panel">
          <h2>Suas editorias</h2>
          {categories.map((c) => (
            <div className="record-line" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <small>/{c.slug}</small>
              </div>
              <Delete id={c.id} table="categories" portalId={portalId} />
            </div>
          ))}
          {!categories.length && (
            <p className="muted">Nenhuma categoria cadastrada.</p>
          )}
          <p className="field-hint">
            Categorias usadas em notícias precisam ser removidas das notícias
            antes da exclusão.
          </p>
        </section>
        <form action={saveCategory} className="panel">
          <PortalId id={portalId} />
          <h2>Nova categoria</h2>
          <label>
            Nome
            <input name="name" required maxLength={100} />
          </label>
          <label>
            URL amigável
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </label>
          <SubmitButton>Criar categoria</SubmitButton>
        </form>
      </div>
    );
  } else if (key === "aparencia") {
    const s = presentationSettings(portal.settings, portal.template);
    body = (
      <form action={saveSettings}>
        <PortalId id={portalId} />
        <div className="editor-grid">
          <div>
            <section className="panel">
              <h2>Identidade do portal</h2>
              <label>
                Nome
                <input name="name" required defaultValue={portal.name} />
              </label>
              <label>
                Descrição
                <textarea
                  name="description"
                  maxLength={300}
                  defaultValue={s.description}
                />
              </label>
              <div className="form-columns">
                <MediaInput
                  portalId={portalId}
                  label="Logotipo"
                  name="logo"
                  value={s.logo}
                />
                <MediaInput
                  portalId={portalId}
                  label="Favicon"
                  name="favicon"
                  value={s.favicon}
                />
              </div>
              <label>
                Cor principal
                <input
                  name="color"
                  type="color"
                  defaultValue={s.color || "#6324dc"}
                />
              </label>
              <label>
                Tipografia
                <select
                  aria-label="Tipografia"
                  name="font"
                  defaultValue={s.font || "sans"}
                >
                  <option value="sans">Sans — contemporânea</option>
                  <option value="serif">Serif — editorial</option>
                </select>
              </label>
              <label>
                Template
                <select
                  aria-label="Template"
                  name="template"
                  defaultValue={portal.template}
                >
                  <option value="classic">Influente News</option>
                  <option value="modern">Revista Influente</option>
                </select>
              </label>
              <p className="field-hint">
                Mudar o template preserva todas as notícias e seções.
              </p>
            </section>
            <AppearanceDetails portalId={portalId} settings={s} />
            <section className="panel">
              <h2>Menu de navegação</h2><label>Organização do menu<select name="menusMode" aria-label="Organização do menu" defaultValue={s.menusMode||"auto"}><option value="auto">Categorias automáticas e meus links</option><option value="custom">Usar apenas meus links, na ordem escolhida</option></select></label>
              <LinksEditor name="menus" value={s.menus} />
            </section>
            <section className="panel">
              <h2>Redes sociais</h2>
              <LinksEditor name="socials" value={s.socials} />
            </section>
          </div>
          <aside>
            <section className="panel">
              <h2>Cabeçalho e rodapé</h2>
              <label>
                Texto superior
                <input name="header" maxLength={100} defaultValue={s.header} />
              </label>
              <label>
                Rodapé
                <textarea
                  name="footer"
                  maxLength={1000}
                  defaultValue={s.footer}
                />
              </label>
              <SubmitButton>Salvar personalização</SubmitButton>
              <a
                className="text-link"
                href={`/p/${portal.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver portal ↗
              </a>
            </section>
          </aside>
        </div>
      </form>
    );
  } else if (key === "homepage") {
    const [d, a, c, b, p] = await Promise.all([
      client.rpc("get_home_draft", { target: portalId }),
      client
        .from("articles")
        .select("*")
        .eq("portal_id", portalId)
        .order("updated_at", { ascending: false })
        .limit(200),
      client
        .from("categories")
        .select("id,name,slug")
        .eq("portal_id", portalId),
      client
        .from("campaigns")
        .select("*")
        .eq("portal_id", portalId)
        .eq("active", true),
      client
        .from("partners")
        .select("*")
        .eq("portal_id", portalId)
        .eq("active", true),
    ]);
    if (d.error || a.error || c.error || b.error || p.error)
      throw new Error("Não foi possível carregar o editor.");
    body = (
      <HomeBuilder
        portalId={portalId}
        portal={portal}
        campaigns={(b.data as Campaign[]).filter(
          (v) =>
            (!v.starts_at || Date.parse(v.starts_at) <= Date.now()) &&
            (!v.ends_at || Date.parse(v.ends_at) > Date.now()),
        )}
        partners={p.data as Partner[]}
        initial={d.data as Section[]}
        articles={a.data as Article[]}
        categories={c.data as Category[]}
      />
    );
  } else if (key === "midia") {
    const media = check(
      await client
        .from("media")
        .select("*")
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false }),
    );
    body = (
      <>
        <section className="panel">
          <h2>Adicionar à biblioteca</h2>
          <MediaInput portalId={portalId} label="Arquivo" />
          <p className="field-hint">
            Depois do envio, recarregue a lista para visualizar o arquivo
            abaixo.
          </p>
          <Link className="text-link" href={`${base}/midia`}>
            Atualizar biblioteca ↻
          </Link>
        </section>
        <div className="media-grid">
          {media.map((m) => (
            <article className="panel" key={m.id}>
              <img src={m.url} alt={m.name} />
              <h3>{m.name}</h3>
              <p className="field-hint">
                {Math.round(m.size / 1024)} KB · WebP
              </p>
              <input readOnly aria-label="URL da imagem" value={m.url} />
              <p className="field-hint">
                Excluir também remove o arquivo. Revise usos em notícias e
                banners.
              </p>
              <Delete id={m.id} table="media" portalId={portalId} />
            </article>
          ))}
        </div>
      </>
    );
  } else if (key === "publicidade") {
    const campaigns = check(
      await client
        .from("campaigns")
        .select("*")
        .eq("portal_id", portalId)
        .order("name"),
    ) as Campaign[];
    const form = (c?: Campaign) => (
      <form action={saveCampaign} className="panel" key={c?.id || "new"}>
        <PortalId id={portalId} />
        <input type="hidden" name="id" value={c?.id || ""} />
        <h2>{c ? "Editar campanha" : "Nova campanha"}</h2>
        <label>
          Nome
          <input name="name" defaultValue={c?.name} required />
        </label>
        <MediaInput portalId={portalId} value={c?.image_url} />
        <label>
          Link
          <input name="link" defaultValue={c?.link} placeholder="https://..." />
        </label>
        <label>
          Posição
          <select
            aria-label="Posição"
            name="position"
            defaultValue={c?.position || "header"}
          >
            <option value="header">Cabeçalho</option>
            <option value="sidebar">Lateral</option>
            <option value="footer">Rodapé</option>
            <option value="between">Entre editorias</option>
            <option value="category">Ao lado da editoria</option>
            <option value="sponsored">Ao lado do publieditorial</option>
          </select>
        </label>
        <div className="form-columns">
          <label>
            Início (UTC)
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={c?.starts_at?.slice(0, 16)}
            />
          </label>
          <label>
            Fim (UTC)
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={c?.ends_at?.slice(0, 16)}
            />
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            name="active"
            defaultChecked={c?.active ?? true}
          />
          Campanha ativa
        </label>
        <SubmitButton>Salvar campanha</SubmitButton>
      </form>
    );
    body = (
      <>
        <div className="editor-grid">
          <div>
            {campaigns.map((c) => (
              <div key={c.id}>
                {form(c)}
                <Delete id={c.id} table="campaigns" portalId={portalId} />
              </div>
            ))}
          </div>
          <aside>{form()}</aside>
        </div>
        {!campaigns.length && (
          <p className="muted">Nenhuma campanha cadastrada.</p>
        )}
      </>
    );
  } else if (key === "parceiros") {
    const partners = check(
      await client
        .from("partners")
        .select("*")
        .eq("portal_id", portalId)
        .order("name"),
    ) as Partner[];
    const form = (p?: Partner) => (
      <form action={savePartner} className="panel" key={p?.id || "new"}>
        <PortalId id={portalId} />
        <input type="hidden" name="id" value={p?.id || ""} />
        <h2>{p ? "Editar parceiro" : "Novo parceiro"}</h2>
        <label>
          Nome
          <input name="name" required defaultValue={p?.name} />
        </label>
        <MediaInput portalId={portalId} label="Logotipo" value={p?.image_url} />
        <label>
          Link
          <input name="link" defaultValue={p?.link} />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="active"
            defaultChecked={p?.active ?? true}
          />
          Exibir no portal
        </label>
        <SubmitButton>Salvar parceiro</SubmitButton>
      </form>
    );
    body = (
      <div className="editor-grid">
        <div>
          {partners.map((p) => (
            <div key={p.id}>
              {form(p)}
              <Delete id={p.id} table="partners" portalId={portalId} />
            </div>
          ))}
        </div>
        <aside>{form()}</aside>
      </div>
    );
  } else if (key === "paginas") {
    const pages = check(
      await client
        .from("pages")
        .select("*")
        .eq("portal_id", portalId)
        .order("title"),
    );
    const edit =
      section[1] === "nova" ? null : pages.find((p) => p.id === section[1]);
    if (section[1] && section[1] !== "nova" && !edit) notFound();
    body = section[1] ? (
      <form action={savePage} className="panel">
        <PortalId id={portalId} />
        <input type="hidden" name="id" value={edit?.id || ""} />
        <label>
          Título
          <input name="title" required defaultValue={edit?.title} />
        </label>
        <label>
          URL amigável
          <input
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
            defaultValue={edit?.slug}
          />
        </label>
        <RichEditor portalId={portalId} value={edit?.content} />
        <label className="check-label">
          <input
            type="checkbox"
            name="published"
            defaultChecked={edit?.published}
          />
          Página publicada
        </label>
        <SubmitButton>Salvar página</SubmitButton>
      </form>
    ) : (
      <>
        <div className="list-toolbar">
          <Button asChild>
            <Link href={`${base}/paginas/nova`}>＋ Nova página</Link>
          </Button>
        </div>
        <section className="panel">
          {pages.map((p) => (
            <div className="record-line" key={p.id}>
              <div>
                <Link href={`${base}/paginas/${p.id}`}>{p.title}</Link>
                <small>{p.published ? "Publicada" : "Rascunho"}</small>
              </div>
              <div className="row-actions">
                <a
                  href={`/p/${portal.slug}/pagina/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver página
                </a>
                <Delete id={p.id} table="pages" portalId={portalId} />
              </div>
            </div>
          ))}
          {!pages.length && (
            <Empty>
              Adicione páginas como Sobre, Contato e Política de Privacidade.
            </Empty>
          )}
        </section>
      </>
    );
  } else if (key === "leitores") {
    const [messages, subscribers] = await Promise.all([
      client
        .from("portal_contacts")
        .select("*")
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false })
        .limit(100),
      client
        .from("portal_subscribers")
        .select("id,email,created_at")
        .eq("portal_id", portalId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (messages.error || subscribers.error)
      throw new Error(
        "Não foi possível carregar mensagens. Aplique a migration de leitores.",
      );
    body = (
      <>
        <div className="list-toolbar">
          <a
            className="button button-outline"
            href={`${base}/leitores/exportar?tipo=mensagens`}
          >
            Exportar mensagens CSV
          </a>
          <a
            className="button button-outline"
            href={`${base}/leitores/exportar?tipo=inscricoes`}
          >
            Exportar inscrições CSV
          </a>
        </div>
        <section className="panel">
          <h2>Mensagens da redação</h2>
          {messages.data.length ? (
            messages.data.map((m) => (
              <details key={m.id} className="reader-message">
                <summary>
                  {m.subject} · {m.name} · {m.kind}
                </summary>
                <p>{m.message}</p>
                <p>
                  {m.email} · {m.phone}
                </p>
                <p>
                  {m.address} {m.neighborhood}
                </p>
                <small>
                  {new Date(m.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
                <Delete id={m.id} table="portal_contacts" portalId={portalId} />
              </details>
            ))
          ) : (
            <p className="muted">Nenhuma mensagem recebida.</p>
          )}
        </section>
        <section className="panel">
          <h2>Inscrições para novidades</h2>
          {subscribers.data.length ? (
            subscribers.data.map((s) => (
              <div className="record-line" key={s.id}>
                <span>{s.email}</span>
                <Delete
                  id={s.id}
                  table="portal_subscribers"
                  portalId={portalId}
                />
              </div>
            ))
          ) : (
            <p className="muted">Nenhuma inscrição recebida.</p>
          )}
          <p className="field-hint">
            Até 100 registros recentes nesta tela. O CSV inclui todos os
            registros. O cadastro registra o interesse; disparos de e-mail
            precisam de uma ferramenta de envio.
          </p>
        </section>
      </>
    );
  } else if (key === "dominios") {
    const domains = check(
      await client.from("domains").select("*").eq("portal_id", portalId),
    );
    const baseDomain = process.env.PORTAL_BASE_DOMAIN;
    body = (
      <div className="editor-grid">
        <div>
          <section className="panel">
            <h2>Endereço provisório</h2>
            <a
              href={
                baseDomain
                  ? `https://${portal.slug}.${baseDomain}`
                  : `/p/${portal.slug}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {baseDomain
                ? `${portal.slug}.${baseDomain}`
                : `/p/${portal.slug}`}{" "}
              ↗
            </a>
            <p className="field-hint">
              Subdomínios exigem wildcard DNS e domínio wildcard associado ao
              projeto Vercel.
            </p>
          </section>
          {domains.map((d) => (
            <section className="panel" key={d.id}>
              <h2>{d.hostname}</h2>
              <span className={`badge ${d.verified ? "published" : "draft"}`}>
                {d.verified ? "Verificado" : "Aguardando DNS"}
              </span>
              <p>
                Adicione este domínio ao seu DNS conforme os registros indicados
                em Vercel → Project → Domains. O destino pode variar por
                projeto; use os valores oficiais exibidos pelo provedor.
              </p>
              {d.provider_status?.verification?.map(
                (
                  v: { type: string; domain: string; value: string },
                  i: number,
                ) => (
                  <pre key={i}>
                    {v.type} · {v.domain}\n{v.value}
                  </pre>
                ),
              )}
              {(d.provider_status?.recommendedCNAME || []).map(
                (v: { value: string }, i: number) => (
                  <pre key={`cname-${i}`}>CNAME · {v.value}</pre>
                ),
              )}
              {(d.provider_status?.recommendedIPv4 || []).map(
                (v: { value: string }, i: number) => (
                  <pre key={`ipv4-${i}`}>A · {v.value}</pre>
                ),
              )}
              {d.provider_status?.checked_at && (
                <p className="field-hint">
                  Última consulta: {d.provider_status.checked_at}
                </p>
              )}
              <div className="row-actions">
                <form action={verifyDomain}>
                  <PortalId id={portalId} />
                  <input type="hidden" name="id" value={d.id} />
                  <SubmitButton>Verificar DNS e HTTPS</SubmitButton>
                </form>
                <form action={deleteDomain}>
                  <PortalId id={portalId} />
                  <input type="hidden" name="id" value={d.id} />
                  <DeleteButton />
                </form>
              </div>
            </section>
          ))}
        </div>
        <aside>
          <form action={addDomain} className="panel">
            <PortalId id={portalId} />
            <h2>Conectar domínio</h2>
            <label>
              Domínio
              <input name="hostname" placeholder="noticias.com.br" required />
            </label>
            <SubmitButton>Conectar domínio</SubmitButton>
            <p className="field-hint">
              Necessita de projeto Vercel e token administrativo configurados no
              servidor. Nenhum domínio será marcado como verificado sem resposta
              oficial.
            </p>
          </form>
        </aside>
      </div>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{portal.name}</p>
          <h1>{heading[0]}</h1>
          <p className="muted">{heading[1]}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/p/${portal.slug}`} target="_blank">
            Ver portal ↗
          </Link>
        </Button>
      </div>
      {query.notice && (
        <p className="notice" role="status">
          {query.notice}
        </p>
      )}
      {body}
    </>
  );
}
