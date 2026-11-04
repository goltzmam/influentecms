"use client";
import { Play, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { Campaign, Partner, Section, Category } from "@/lib/types";
import type { Creative } from "@/lib/experience";
import { MediaInput } from "./media-input";
import { SubmitButton } from "./submit-button";
import { AdCreative, PartnerCard } from "./ad-creative";
import { saveCampaign, savePartner, removeRecord } from "@/app/painel/actions";
import { DeleteButton } from "./delete-button";
type Item = Campaign | Partner;
type Target = { value: string; label: string };
export function CommercialManager({
  portalId,
  kind,
  items,
  categories = [],
  sections = [],
  pages = [],
}: {
  portalId: string;
  kind: "campaign" | "partner";
  items: Item[];
  categories?: Category[];
  sections?: Section[];
  pages?: Target[];
}) {
  const [draftKey, setDraftKey] = useState(0);
  const [selected, setSelected] = useState(""),
    [search, setSearch] = useState("");
  const active = items.find((item) => item.id === selected);
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  const title = kind === "campaign" ? "campanha" : "parceiro";
  return (
    <div className="commercial-workspace">
      <div className="commercial-summary">
        <div>
          <span>
            {kind === "campaign"
              ? "SUA VITRINE COMERCIAL"
              : "RELAÇÕES QUE FORTALECEM"}
          </span>
          <h2>
            {kind === "campaign"
              ? "Mais presença. Mais possibilidades."
              : "Parcerias que merecem destaque."}
          </h2>
          <p>
            {kind === "campaign"
              ? "Crie peças, escolha formatos e decida exatamente onde cada anúncio aparece."
              : "Uma vitrine organizada para marcas, projetos e histórias parceiras."}
          </p>
        </div>
        <div className="commercial-metrics">
          <div>
            <strong>{items.length}</strong>
            <small>{kind === "campaign" ? "campanhas" : "parceiros"}</small>
          </div>
          <div>
            <strong>{items.filter((item) => item.active).length}</strong>
            <small>ativos</small>
          </div>
        </div>
      </div>
      <div className="commercial-report-link">
        <a
          className="button button-outline"
          href={`/painel/${portalId}/metricas?kind=${kind === "campaign" ? "campaign" : "partner"}`}
        >
          Ver métricas e baixar PDF →
        </a>
      </div>
      <div className="commercial-toolbar">
        <input
          type="search"
          aria-label={
            kind === "campaign" ? "Buscar campanhas" : "Buscar parceiros"
          }
          placeholder={`Buscar ${kind === "campaign" ? "campanhas" : "parceiros"}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setSelected("");
            setDraftKey((key) => key + 1);
            if (window.innerWidth < 1000)
              requestAnimationFrame(() =>
                document
                  .querySelector(".commercial-edit-pane")
                  ?.scrollIntoView({ behavior: "smooth" }),
              );
          }}
        >
          + {kind === "campaign" ? "Nova campanha" : "Novo parceiro"}
        </button>
      </div>
      <div className="commercial-layout">
        <section className="commercial-library" aria-label="Peças cadastradas">
          {filtered.length ? (
            <div className="commercial-card-grid">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`commercial-card ${selected === item.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelected(item.id);
                    if (window.innerWidth < 1000)
                      requestAnimationFrame(() =>
                        document
                          .querySelector(".commercial-edit-pane")
                          ?.scrollIntoView({ behavior: "smooth" }),
                      );
                  }}
                >
                  <div className="commercial-thumbnail">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" />
                    ) : (
                      <span>
                        {item.creative?.mediaType === "video" ? (
                          <Play size={36} />
                        ) : (
                          item.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                    )}
                    <span
                      className={`badge ${item.active ? "published" : "draft"}`}
                    >
                      {item.active ? "Ativo" : "Pausado"}
                    </span>
                  </div>
                  <div className="commercial-card-copy">
                    <strong>{item.name}</strong>
                    <span>
                      {item.creative?.mediaType === "video"
                        ? "Vídeo"
                        : item.creative?.mediaType === "text"
                          ? "Conteúdo editorial"
                          : "Imagem clicável"}
                    </span>
                    <small>
                      Editar peça <ArrowUpRight size={13} aria-hidden="true" />
                    </small>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="commercial-empty">
              <span aria-hidden="true">◈</span>
              <h3>
                {search
                  ? "Nenhum resultado"
                  : "Sua próxima conexão começa aqui"}
              </h3>
              <p>
                {search
                  ? "Tente outro nome."
                  : `Crie seu primeiro ${title} pelo editor ao lado. Imagens, vídeos e chamadas ganham uma apresentação à altura.`}
              </p>
            </div>
          )}
          <div className="commercial-guide">
            <h3>Seu conteúdo, no lugar certo</h3>
            <p>
              {kind === "campaign"
                ? "Escolha páginas e seções específicas. Para posicionar visualmente, adicione um bloco de anúncio no Editor visual e selecione a campanha."
                : "Use a aba Parceiros na Personalização para definir cores, colunas, imagens e o formato da vitrine em qualquer tema."}
            </p>
          </div>
        </section>
        <aside className="commercial-edit-pane">
          <CreativeForm
            key={active?.id || `new-${draftKey}`}
            portalId={portalId}
            kind={kind}
            item={active}
            categories={categories}
            sections={sections}
            pages={pages}
          />
          {active && (
            <form action={removeRecord} className="commercial-delete">
              <input type="hidden" name="portal_id" value={portalId} />
              <input
                type="hidden"
                name="table"
                value={kind === "campaign" ? "campaigns" : "partners"}
              />
              <input type="hidden" name="id" value={active.id} />
              <DeleteButton />
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
function CreativeForm({
  portalId,
  kind,
  item,
  categories,
  sections,
  pages,
}: {
  portalId: string;
  kind: "campaign" | "partner";
  item?: Item;
  categories: Category[];
  sections: Section[];
  pages: Target[];
}) {
  const [name, setName] = useState(item?.name || ""),
    [image, setImage] = useState(item?.image_url || ""),
    [link, setLink] = useState(item?.link || ""),
    [position, setPosition] = useState(
      "position" in (item || {}) ? (item as Campaign).position : "header",
    );
  const [creative, setCreative] = useState<Partial<Creative>>({
    mediaType: "image",
    format: "auto",
    ...item?.creative,
  });
  function edit<K extends keyof Creative>(key: K, value: Creative[K]) {
    setCreative((current) => ({ ...current, [key]: value }));
  }
  const preview = {
    id: item?.id || "preview",
    name: name || "Sua marca em destaque",
    image_url: image,
    link,
    position,
    active: true,
    starts_at: null,
    ends_at: null,
    creative,
  };
  const campaign = kind === "campaign";
  return (
    <form
      action={campaign ? saveCampaign : savePartner}
      className="panel creative-form"
    >
      <input type="hidden" name="portal_id" value={portalId} />
      <input type="hidden" name="id" value={item?.id || ""} />
      <input type="hidden" name="creative" value={JSON.stringify(creative)} />
      <div className="creative-form-heading">
        <span className="eyebrow">{item ? "EDITAR PEÇA" : "CRIAR PEÇA"}</span>
        <h2>
          {item
            ? campaign
              ? "Editar campanha"
              : "Editar parceiro"
            : campaign
              ? "Nova campanha"
              : "Novo parceiro"}
        </h2>
        <p>Veja sua peça ganhar forma enquanto você edita.</p>
      </div>
      {item && (
        <p>
          <a
            className="text-link"
            href={`/painel/${portalId}/metricas?kind=${kind === "campaign" ? "campaign" : "partner"}&item=${item.id}`}
          >
            Métricas desta peça e relatório PDF →
          </a>
        </p>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={creative.demo || false}
          onChange={(e) => edit("demo", e.target.checked)}
        />
        Peça demonstrativa (não conta nas métricas)
      </label>
      <label>
        Nome
        <input
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            campaign ? "Ex.: Lançamento de verão" : "Nome da marca ou projeto"
          }
        />
      </label>
      <label>
        Tipo de conteúdo
        <select
          aria-label="Tipo de conteúdo"
          value={creative.mediaType}
          onChange={(e) =>
            edit("mediaType", e.target.value as Creative["mediaType"])
          }
        >
          <option value="image">Imagem com link</option>
          <option value="video">Vídeo com chamada</option>
          <option value="text">Conteúdo e chamada</option>
          {campaign && <option value="google">Google AdSense</option>}
        </select>
      </label>
      {creative.mediaType !== "text" && creative.mediaType !== "google" && (
        <MediaInput
          portalId={portalId}
          label={campaign ? "Imagem" : "Logotipo"}
          name="image_url"
          value={image}
          onChange={setImage}
        />
      )}{" "}
      {creative.mediaType === "text" && (
        <input type="hidden" name="image_url" value={image} />
      )}
      {creative.mediaType === "video" && (
        <label>
          Link do vídeo
          <input
            type="url"
            value={creative.videoUrl || ""}
            onChange={(e) => edit("videoUrl", e.target.value)}
            placeholder="YouTube ou arquivo MP4/WebM"
            required
          />
        </label>
      )}
      {creative.mediaType === "google" && (
        <label>
          Identificador do bloco Google
          <input
            aria-label="Identificador do bloco Google"
            value={creative.googleSlot || ""}
            onChange={(e) => edit("googleSlot", e.target.value.trim())}
            inputMode="numeric"
            required
          />
          <span className="field-hint">
            A conta é a mesma configurada em Personalização → Google AdSense.
            Escolha abaixo a página e a posição.
          </span>
        </label>
      )}
      <label>
        Link
        <input
          name="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Destino ao clicar na peça"
        />
      </label>
      <details className="settings-disclosure" open={!campaign}>
        <summary>Texto e botão da peça</summary>
        <div className="form-columns">
          <label>
            Chamada do botão
            <input
              value={creative.cta || ""}
              onChange={(e) => edit("cta", e.target.value)}
              placeholder="Saiba mais"
              maxLength={80}
            />
          </label>
          <label>
            Descrição da imagem
            <input
              value={creative.alt || ""}
              onChange={(e) => edit("alt", e.target.value)}
              maxLength={300}
              placeholder="Texto acessível"
            />
          </label>
        </div>
        <label>
          Apresentação
          <textarea
            value={creative.description || ""}
            onChange={(e) => edit("description", e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="O que torna esta marca ou campanha especial?"
          />
        </label>
      </details>
      {campaign && (
        <>
          <label>
            Posição
            <select
              name="position"
              aria-label="Posição"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              {[
                ["header", "Cabeçalho do portal"],
                ["before-content", "Antes do conteúdo"],
                ["after-content", "Depois do conteúdo"],
                ["sidebar", "Coluna lateral"],
                ["footer", "Antes do rodapé"],
                ["between", "Entre editorias"],
                ["category", "Ao lado da editoria"],
                ["sponsored", "Ao lado de uma parceria"],
                ["article-top", "Início da notícia"],
                ["article-middle", "Dentro da notícia"],
                ["article-bottom", "Fim da notícia"],
                ["page-top", "Início de página institucional"],
                ["page-bottom", "Fim de página institucional"],
                ["inline", "Seções escolhidas no editor"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <details className="settings-disclosure">
            <summary>Páginas e seções de exibição</summary>

            <fieldset className="target-checks">
              <legend>Tipos de página</legend>
              {(
                [
                  ["home", "Página inicial"],
                  ["article", "Notícias"],
                  ["category", "Editorias"],
                  ["page", "Páginas institucionais"],
                  ["search", "Busca"],
                ] as const
              ).map(([key, label]) => (
                <label className="check-label" key={key}>
                  <input
                    type="checkbox"
                    checked={(creative.pageKinds || []).includes(key)}
                    onChange={(e) =>
                      edit(
                        "pageKinds",
                        e.target.checked
                          ? [...(creative.pageKinds || []), key]
                          : (creative.pageKinds || []).filter((v) => v !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
              <small>Nenhuma opção marcada: todos os tipos.</small>
            </fieldset>
            {pages.length > 0 && (
              <label>
                Páginas específicas
                <select
                  multiple
                  aria-label="Páginas específicas"
                  value={creative.pageSlugs || []}
                  onChange={(e) =>
                    edit(
                      "pageSlugs",
                      Array.from(e.target.selectedOptions).map((v) => v.value),
                    )
                  }
                >
                  {pages.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <small>
                  Opcional. Use Ctrl/Cmd para selecionar mais de uma.
                </small>
              </label>
            )}
            {categories.length > 0 && (
              <label>
                Editorias específicas
                <select
                  multiple
                  value={creative.categoryIds || []}
                  onChange={(e) =>
                    edit(
                      "categoryIds",
                      Array.from(e.target.selectedOptions).map((v) => v.value),
                    )
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {sections.length > 0 && (
              <label>
                Seções específicas
                <select
                  multiple
                  aria-label="Seções específicas"
                  value={creative.sectionIds || []}
                  onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions).map(
                      (v) => v.value,
                    );
                    edit("sectionIds", ids);
                    if (ids.length) setPosition("inline");
                  }}
                >
                  {sections.map((section, index) => (
                    <option key={section.id} value={section.id}>
                      {section.title || `Seção ${index + 1} · ${section.type}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!!creative.sectionIds?.length && (
              <label>
                Dentro da seção
                <select
                  value={creative.sectionPlacement || "after"}
                  onChange={(e) =>
                    edit(
                      "sectionPlacement",
                      e.target.value as "before" | "after",
                    )
                  }
                >
                  <option value="before">Antes do conteúdo da seção</option>
                  <option value="after">Depois do conteúdo da seção</option>
                </select>
              </label>
            )}
            <label>
              Repetir no feed a cada notícias
              <input
                type="number"
                min="0"
                max="20"
                value={creative.repeatEvery || 0}
                onChange={(e) => edit("repeatEvery", Number(e.target.value))}
              />
              <small>
                Use 0 para não repetir. A repetição usa a posição Seções
                escolhidas no editor, sem selecionar uma seção.
              </small>
            </label>
            <label>
              Dispositivos
              <select
                value={creative.device || "all"}
                onChange={(e) =>
                  edit("device", e.target.value as Creative["device"])
                }
              >
                <option value="all">Computador e celular</option>
                <option value="desktop">Só computador</option>
                <option value="mobile">Só celular</option>
              </select>
            </label>
          </details>
          <details className="settings-disclosure">
            <summary>Formato, medidas e acabamento</summary>
            <label>
              Formato
              <select
                aria-label="Formato da campanha"
                value={creative.format || "auto"}
                onChange={(e) =>
                  edit("format", e.target.value as Creative["format"])
                }
              >
                {[
                  ["auto", "Responsivo automático"],
                  ["billboard", "Painel amplo · 970 × 250"],
                  ["leaderboard", "Faixa · 728 × 90"],
                  ["rectangle", "Retângulo · 300 × 250"],
                  ["skyscraper", "Vertical · 300 × 600"],
                  ["square", "Quadrado · 300 × 300"],
                  ["native", "Conteúdo patrocinado"],
                  ["custom", "Medidas personalizadas"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {creative.format === "custom" && (
              <div className="form-columns">
                <label>
                  Largura da peça
                  <input
                    type="number"
                    min="100"
                    max="2500"
                    value={creative.width || 970}
                    onChange={(e) => edit("width", Number(e.target.value))}
                  />
                </label>
                <label>
                  Altura da peça
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={creative.height || 250}
                    onChange={(e) => edit("height", Number(e.target.value))}
                  />
                </label>
              </div>
            )}
            <div className="form-columns">
              <label>
                Ajuste da imagem
                <select
                  value={creative.fit || "contain"}
                  onChange={(e) =>
                    edit("fit", e.target.value as Creative["fit"])
                  }
                >
                  <option value="contain">Mostrar inteira</option>
                  <option value="cover">Preencher a área</option>
                </select>
              </label>
              <label>
                Alinhamento
                <select
                  value={creative.align || "center"}
                  onChange={(e) =>
                    edit("align", e.target.value as Creative["align"])
                  }
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </label>
              <label>
                Fundo da peça
                <input
                  type="color"
                  value={creative.background || "#f6f8f7"}
                  onChange={(e) => edit("background", e.target.value)}
                />
              </label>
              <label>
                Texto da peça
                <input
                  type="color"
                  value={creative.color || "#17332a"}
                  onChange={(e) => edit("color", e.target.value)}
                />
              </label>
              <label>
                Cantos arredondados
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={creative.radius ?? 12}
                  onChange={(e) => edit("radius", Number(e.target.value))}
                />
              </label>
              <label>
                Ordem de exibição
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={creative.order || 0}
                  onChange={(e) => edit("order", Number(e.target.value))}
                />
              </label>
            </div>
          </details>
          <details className="settings-disclosure">
            <summary>Agendamento</summary>
            <div className="form-columns">
              <label>
                Início (UTC)
                <input
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={(item as Campaign)?.starts_at?.slice(0, 16)}
                />
              </label>
              <label>
                Fim (UTC)
                <input
                  name="ends_at"
                  type="datetime-local"
                  defaultValue={(item as Campaign)?.ends_at?.slice(0, 16)}
                />
              </label>
            </div>
          </details>
        </>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          name="active"
          defaultChecked={item?.active ?? true}
        />
        {campaign ? "Campanha ativa" : "Exibir no portal"}
      </label>
      <div className="creative-live-preview">
        <span className="eyebrow">PRÉVIA DA PEÇA</span>
        {campaign ? (
          <AdCreative campaign={preview} preview />
        ) : (
          <PartnerCard partner={preview} />
        )}
      </div>
      <div className="sticky-form-action">
        <SubmitButton>
          {campaign ? "Salvar campanha" : "Salvar parceiro"}
        </SubmitButton>
      </div>
    </form>
  );
}
