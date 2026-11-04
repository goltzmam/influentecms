"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Globe2,
  Palette,
  PanelsTopLeft,
  FileText,
  LoaderCircle,
  Check,
  ExternalLink,
  X,
} from "lucide-react";
import type { AiBlueprint } from "@/lib/ai/schema";
import { creationPayload, personalize } from "@/lib/ai/schema";
import type { Portal, Section, Article } from "@/lib/types";
import { NewsShell, Homepage } from "./public-template";
import { Button } from "./ui/button";
type Result = {
  jobId: string;
  plan: AiBlueprint;
  references: { url: string; status: string }[];
  warnings: string[];
};
type History = {
  id: string;
  status: string;
  createdAt: string;
  portalId: string | null;
  name: string;
};
function Preview({
  plan,
  onClose,
}: {
  plan: AiBlueprint;
  onClose: () => void;
}) {
  const payload = creationPayload(plan);
  const categories = plan.categories.map((c) => ({
    ...c,
    id: `preview-${c.slug}`,
  }));
  const sections = payload.sections.map((s, i) => ({
    ...s,
    id: `section-${i}`,
    categoryId: categories.find((c) => c.slug === s.categorySlug)?.id,
  })) as Section[];
  const portal = {
    id: "preview",
    organization_id: "preview",
    name: plan.name,
    slug: plan.slug,
    template: plan.template,
    settings: payload.settings,
    home_published: sections,
    created_at: new Date().toISOString(),
  } as Portal;
  const articles = payload.articles.map((a, i) => ({
    ...a,
    id: `article-${i}`,
    portal_id: "preview",
    category_id: categories.find((c) => c.slug === a.categorySlug)?.id || null,
    cover_url: "",
    cover_alt: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    publish_at: null,
    status: "draft",
    seo_title: a.seoTitle,
    seo_description: a.seoDescription,
  })) as Article[];
  return (
    <div
      className="ai-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Prévia do portal gerado"
    >
      <div className="ai-preview-toolbar">
        <span>Prévia do projeto · inclui textos ainda não publicados</span>
        <button type="button" aria-label="Fechar prévia" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div
        className="ai-preview-scroll"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        }}
      >
        <NewsShell
          portal={portal}
          categories={categories}
          campaigns={[]}
          partners={[]}
          basePath="#previa"
          preview
        >
          <Homepage
            portal={portal}
            articles={articles}
            categories={categories}
            campaigns={[]}
            basePath="#previa"
            sections={sections}
          />
        </NewsShell>
      </div>
    </div>
  );
}
export function AiPortalStudio({
  configured,
  history,
  migrationReady,
}: {
  configured: boolean;
  history: History[];
  migrationReady: boolean;
}) {
  const router = useRouter();
  const abort = useRef<AbortController | null>(null);
  const [requireReferences, setRequireReferences] = useState(true);
  const [referenceImages, setReferenceImages] = useState<
    { mimeType: string; data: string; name: string }[]
  >([]);
  const [brief, setBrief] = useState(""),
    [links, setLinks] = useState(""),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [preview, setPreview] = useState(false),
    [publishArticles, setPublishArticles] = useState(true);
  const [edits, setEdits] = useState({
    name: "",
    slug: "",
    template: "classic" as "classic" | "modern" | "daily",
    color: "#6324dc",
    accentColor: "#d5ff00",
    surfaceColor: "#ffffff",
    textColor: "#21152e",
    tagline: "",
  });
  function load(next: Result) {
    setResult(next);
    setEdits({
      name: next.plan.name,
      slug: next.plan.slug,
      template: next.plan.template,
      color: next.plan.identity.color,
      accentColor: next.plan.identity.accentColor,
      surfaceColor: next.plan.identity.surfaceColor,
      textColor: next.plan.identity.textColor,
      tagline: next.plan.identity.tagline,
    });
    setPublishArticles(true);
    setError("");
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    abort.current = new AbortController();
    try {
      const references = [
        ...new Set(
          links
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ];
      const response = await fetch("/api/ai/portals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          references,
          requireReferences,
          referenceImages: referenceImages.map(({ mimeType, data }) => ({
            mimeType,
            data,
          })),
        }),
        signal: abort.current.signal,
      });
      const data = await response.json().catch(() => {
        throw new Error(
          "A FLUE não recebeu uma resposta. Aguarde e tente novamente; seu briefing continua no formulário.",
        );
      });
      if (!response.ok)
        throw new Error(data.error || "Não foi possível gerar.");
      load(data);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  async function restore(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/ai/portals/${id}`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => {
        throw new Error(
          "A FLUE não recebeu uma resposta. Aguarde e tente novamente; seu briefing continua no formulário.",
        );
      });
      if (!response.ok) throw new Error(data.error);
      if (data.status === "created" && data.generated_portal_id) {
        router.push(`/painel/${data.generated_portal_id}`);
        return;
      }
      if (data.status === "failed") {
        setResult(null);
        setReferenceImages([]);
        setBrief(data.brief || "");
        setLinks((data.reference_urls || []).join("\n"));
        return;
      }
      if (data.status !== "ready")
        throw new Error(
          data.status === "generating"
            ? "Este projeto ainda está sendo gerado. Aguarde e abra novamente."
            : "Este projeto não está disponível para criação.",
        );
      load({
        jobId: data.id,
        plan: data.plan,
        references: data.reference_results,
        warnings: data.warnings,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir o projeto.",
      );
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!result) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/ai/portals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.jobId, edits, publishArticles }),
      });
      const data = await response.json().catch(() => {
        throw new Error(
          "A FLUE não recebeu uma resposta. Aguarde e tente novamente; seu briefing continua no formulário.",
        );
      });
      if (!response.ok)
        throw new Error(data.error || "Não foi possível criar.");
      if (data.pending)
        throw new Error(
          "A composição visual ainda está sendo preparada. Aguarde e clique em concluir novamente; o portal não será duplicado.",
        );
      const notice = data.warnings?.length
        ? `Portal criado. ${data.warnings.join(" ")}`
        : "Portal criado com IA. Todos os elementos podem ser editados no painel.";
      router.push(
        `/painel/${data.portalId}?notice=${encodeURIComponent(notice)}`,
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível criar o portal.",
      );
    } finally {
      setCreating(false);
    }
  }
  let edited: AiBlueprint | null = null;
  if (result) {
    try {
      edited = personalize(result.plan, edits);
    } catch {}
  }
  return (
    <div className="ai-studio">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Sparkles size={13} /> ESTÚDIO FLUE
          </p>
          <h1>Uma ideia. Um portal inteiro.</h1>
          <p className="muted">
            Conte o que você imagina. A IA organiza a identidade, as editorias e
            a experiência de leitura.
          </p>
        </div>
        <span className={`ai-provider ${configured ? "ready" : ""}`}>
          <span />
          {configured ? "FLUE conectada" : "FLUE não ativada"}
        </span>
      </div>
      {!configured && (
        <div className="notice" role="status">
          A FLUE está temporariamente indisponível. Tente novamente em
          instantes. <Link href="/painel/configuracoes">Ver integrações →</Link>
        </div>
      )}
      {!migrationReady && (
        <div className="notice" role="alert">
          O Estúdio FLUE está recebendo uma atualização. Tente novamente em
          instantes.
        </div>
      )}
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {!result ? (
        <div className="ai-brief-grid">
          <form onSubmit={generate} className="panel ai-brief">
            <div className="ai-step">
              <span>01</span>
              <h2>Descreva seu próximo portal</h2>
            </div>
            <label htmlFor="ai-brief">O que vamos criar?</label>
            <textarea
              id="ai-brief"
              minLength={20}
              maxLength={5000}
              required
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Crie um portal de notícias fitness chamado SaudeFIT, com foco em treino para iniciantes e qualidade de vida. Quero uma identidade verde, seções de alimentação, movimento e bem-estar e um visual leve."
              disabled={busy}
            />
            <div className="ai-prompt-hints">
              <span>Nome e público</span>
              <span>Foco editorial</span>
              <span>Estilo e cores</span>
              <span>Seções desejadas</span>
            </div>
            <label htmlFor="ai-references">
              Portais de referência{" "}
              <small>Opcional · até 3 links públicos, um por linha</small>
            </label>
            <textarea
              id="ai-references"
              className="ai-links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://portal-referencia.com.br"
              disabled={busy}
            />
            <label className="reference-image-upload">
              Capturas de tela da referência
              <input
                aria-label="Imagens de referência"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={async (event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length + referenceImages.length > 3) {
                    setError("Use até 3 imagens de referência.");
                    return;
                  }
                  if (
                    files.some(
                      (file) =>
                        file.size > 1048576 ||
                        !["image/png", "image/jpeg", "image/webp"].includes(
                          file.type,
                        ),
                    )
                  ) {
                    setError("Use imagens PNG, JPG ou WebP de até 1 MB cada.");
                    return;
                  }
                  const loaded = await Promise.all(
                    files.map(
                      (file) =>
                        new Promise<{
                          mimeType: string;
                          data: string;
                          name: string;
                        }>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve({
                              mimeType: file.type,
                              data: String(reader.result).split(",")[1],
                              name: file.name,
                            });
                          reader.onerror = () =>
                            reject(
                              new Error("Não foi possível abrir uma imagem."),
                            );
                          reader.readAsDataURL(file);
                        }),
                    ),
                  ).catch(() => null);
                  if (!loaded) {
                    setError(
                      "Não foi possível abrir as imagens. Tente novamente.",
                    );
                    return;
                  }
                  setReferenceImages((current) => [...current, ...loaded]);
                  event.target.value = "";
                }}
              />
              <small>
                Até 3 imagens de 1 MB. Útil para menus, rodapés e sites que
                bloqueiam leitura por link.
              </small>
            </label>
            <div className="reference-image-list">
              {referenceImages.map((image, index) => (
                <div key={index}>
                  <img
                    src={`data:${image.mimeType};base64,${image.data}`}
                    alt={`Referência ${index + 1}`}
                  />
                  <span>{image.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Remover referência ${index + 1}`}
                    onClick={() =>
                      setReferenceImages((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={!requireReferences}
                onChange={(event) =>
                  setRequireReferences(!event.target.checked)
                }
              />
              Permitir criar só pelo briefing se uma referência não puder ser
              lida
            </label>
            <p className="field-hint">
              A FLUE usa referências para interpretar composição e estilo.
              Textos, marcas e imagens de outros portais não são importados.
            </p>
            <div className="form-actions">
              <Button
                disabled={!configured || !migrationReady || busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Montando seu projeto…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar meu portal
                  </>
                )}
              </Button>
              {busy && (
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => abort.current?.abort()}
                >
                  Cancelar
                </button>
              )}
            </div>
            {busy && (
              <p role="status" className="field-hint">
                A FLUE está analisando o briefing e montando a estrutura. Isso
                pode levar até quatro minutos.
              </p>
            )}
          </form>
          <aside className="ai-promise">
            <div className="ai-orbit">
              <Sparkles size={34} />
            </div>
            <p className="eyebrow">DA IDEIA À ESTRUTURA</p>
            <h2>
              Criado para o seu tema.
              <br />
              Pronto para ganhar sua voz.
            </h2>
            <ul>
              {[
                [Palette, "Identidade, cores e marca editáveis"],
                [PanelsTopLeft, "Homepage e editorias organizadas"],
                [FileText, "Páginas e textos iniciais com SEO"],
                [Globe2, "Portal integrado ao seu CMS"],
              ].map(([Icon, title], i) => {
                const Comp = Icon as typeof Palette;
                return (
                  <li key={i}>
                    <Comp size={18} />
                    {title as string}
                  </li>
                );
              })}
            </ul>
            <p>
              Você revisa a proposta antes da criação. Depois, continua editando
              no mesmo painel, com editor de texto, mídia, banners e domínios.
            </p>
          </aside>
        </div>
      ) : (
        <>
          <div className="ai-project-heading">
            <div>
              <span className="eyebrow">02 · SEU PROJETO EDITORIAL</span>
              <h2>{edits.name || result.plan.name}</h2>
              <p>{result.plan.rationale}</p>
            </div>
            <Button
              variant="outline"
              disabled={!edited}
              onClick={() => setPreview(true)}
              type="button"
            >
              <ExternalLink size={15} />
              Pré-visualizar portal
            </Button>
          </div>
          <div className="ai-counts">
            <div>
              <strong>{result.plan.categories.length}</strong>
              <span>editorias</span>
            </div>
            <div>
              <strong>
                {result.plan.sections.length +
                  (result.plan.includeWelcome !== false ? 1 : 0)}
              </strong>
              <span>seções na homepage</span>
            </div>
            <div>
              <strong>{result.plan.pages.length}</strong>
              <span>páginas institucionais</span>
            </div>
            <div>
              <strong>{result.plan.articles.length}</strong>
              <span>textos iniciais</span>
            </div>
          </div>
          {result.warnings.map((w, i) => (
            <p className="notice" key={i}>
              {w}
            </p>
          ))}
          <form onSubmit={create} className="ai-review-grid">
            <div>
              <section className="panel">
                <h2>Uma identidade que você controla</h2>
                <div className="form-columns">
                  <label>
                    Nome do portal
                    <input
                      value={edits.name}
                      onChange={(e) =>
                        setEdits({ ...edits, name: e.target.value })
                      }
                      required
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Endereço provisório
                    <input
                      value={edits.slug}
                      onChange={(e) =>
                        setEdits({ ...edits, slug: e.target.value })
                      }
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      maxLength={63}
                    />
                  </label>
                </div>
                <label>
                  Assinatura da marca
                  <input
                    value={edits.tagline}
                    maxLength={160}
                    onChange={(e) =>
                      setEdits({ ...edits, tagline: e.target.value })
                    }
                  />
                </label>
                <label>
                  Template
                  <select
                    aria-label="Template do projeto"
                    value={edits.template}
                    onChange={(e) =>
                      setEdits({
                        ...edits,
                        template: e.target.value as
                          "classic" | "modern" | "daily",
                      })
                    }
                  >
                    <option value="classic">Influente News</option>
                    <option value="modern">Revista Influente</option>
                    <option value="daily">Jornal Diário</option>
                  </select>
                </label>
                <div className="ai-palette">
                  {(
                    [
                      ["color", "Principal"],
                      ["accentColor", "Destaque"],
                      ["surfaceColor", "Fundo"],
                      ["textColor", "Texto"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="color"
                        value={edits[key]}
                        onChange={(e) =>
                          setEdits({ ...edits, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Arquitetura da homepage</h2>
                <div className="ai-taxonomy">
                  {result.plan.categories.map((c) => (
                    <span key={c.slug}>{c.name}</span>
                  ))}
                </div>
                <ol className="ai-section-list">
                  {result.plan.includeWelcome !== false && (
                    <li>
                      <span>01</span>
                      <div>
                        <strong>{result.plan.identity.welcomeTitle}</strong>
                        <small>Apresentação editorial</small>
                      </div>
                    </li>
                  )}
                  {result.plan.sections.map((s, i) => (
                    <li key={i}>
                      <span>{String(i + 2).padStart(2, "0")}</span>
                      <div>
                        <strong>
                          {s.title ||
                            {
                              lead: "Manchetes",
                              latest: "Notícias recentes",
                              banner: "Publicidade",
                              text: "Texto editorial",
                              category: "Editoria",
                              video: "Vídeo",
                              image: "Imagem",
                              sponsored: "Patrocinado",
                              featured: "Destaques",
                            }[s.type]}
                        </strong>
                        <small>{s.categorySlug || s.type}</small>
                      </div>
                      <Check size={15} />
                    </li>
                  ))}
                </ol>
              </section>
              <section className="panel">
                <h2>Páginas e textos para revisar</h2>
                {result.plan.pages.map((p) => (
                  <details className="ai-copy" key={p.slug}>
                    <summary>
                      {p.title}
                      <span>
                        {[
                          "privacidade",
                          "termos",
                          "politica-de-privacidade",
                        ].includes(p.slug)
                          ? "Rascunho para revisão"
                          : "Página institucional"}
                      </span>
                    </summary>
                    <p>{p.body}</p>
                  </details>
                ))}
                {result.plan.articles.map((a) => (
                  <details className="ai-copy" key={a.slug}>
                    <summary>
                      {a.title}
                      <span>Texto gerado por IA</span>
                    </summary>
                    <p>{a.subtitle}</p>
                    <p>{a.body}</p>
                  </details>
                ))}
              </section>
            </div>
            <aside>
              <section className="panel ai-create-card">
                <span className="ai-step-number">03</span>
                <h2>Seu portal, de verdade</h2>
                <p>
                  A estrutura será salva no CMS com categorias, páginas,
                  identidade, imagens editoriais e espaços demonstrativos de
                  publicidade e parceiros. Você poderá alterar tudo depois.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={publishArticles}
                    onChange={(e) => setPublishArticles(e.target.checked)}
                  />
                  Publicar também os textos iniciais gerados por IA
                </label>
                <p className="field-hint">
                  Desmarcado: textos ficam como rascunhos no editor de texto.
                  Revise o conteúdo antes de publicar. Páginas legais permanecem
                  em rascunho.
                </p>
                <Button type="submit" disabled={creating || !edited}>
                  {creating ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Criando portal…
                    </>
                  ) : (
                    <>
                      Criar portal editável
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  disabled={creating}
                  className="button-ghost"
                  onClick={() => setResult(null)}
                >
                  Voltar ao briefing
                </button>
              </section>
              {result.references.length > 0 && (
                <section className="panel">
                  <h2>Referências utilizadas</h2>
                  {result.references.map((ref) => (
                    <div className="ai-reference" key={ref.url}>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {new URL(ref.url).hostname}
                        <ExternalLink size={12} />
                      </a>
                      <small>
                        {ref.status === "retrieved"
                          ? "Consulta confirmada pela FLUE"
                          : "Consulta não confirmada"}
                      </small>
                    </div>
                  ))}
                </section>
              )}
            </aside>
          </form>
        </>
      )}
      {history.length > 0 && (
        <section className="panel ai-history">
          <h2>Seus projetos recentes</h2>
          {history.map((job) => (
            <div className="record-line" key={job.id}>
              <div>
                <strong>{job.name}</strong>
                <small>
                  {new Date(job.createdAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  ·{" "}
                  {{
                    generating: "Gerando",
                    ready: "Pronto para criar",
                    failed: "Geração não concluída",
                    created: "Portal criado",
                  }[job.status] || job.status}
                </small>
              </div>
              {job.portalId ? (
                <Link className="text-link" href={`/painel/${job.portalId}`}>
                  Abrir portal →
                </Link>
              ) : (
                ["ready", "generating", "failed"].includes(job.status) && (
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => restore(job.id)}
                    disabled={busy || creating}
                  >
                    {job.status === "failed"
                      ? "Retomar briefing"
                      : "Abrir projeto"}
                  </button>
                )
              )}
            </div>
          ))}
        </section>
      )}
      {preview && edited && (
        <Preview plan={edited} onClose={() => setPreview(false)} />
      )}
    </div>
  );
}
