"use client";
import { useState, type DragEvent } from "react";
import { referenceSections, presentationSettings } from "@/lib/presentation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveHomepage, uploadMedia } from "@/app/painel/actions";
import type {
  Section,
  Category,
  Article,
  Portal,
  Campaign,
  Partner,
} from "@/lib/types";
import { MediaInput } from "./media-input";
import { SubmitButton } from "./submit-button";
import { Homepage, NewsShell } from "./public-template";
function Block({
  section,
  update,
  remove,
  categories,
  articles,
  portalId,
}: {
  section: Section;
  update: (v: Section) => void;
  remove: () => void;
  categories: Category[];
  articles: Article[];
  portalId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });
  return (
    <section
      id={`block-${section.id}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="builder-block"
    >
      <div className="block-heading">
        <button
          type="button"
          className="drag-handle"
          aria-label="Arrastar seção"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <strong>
          {
            {
              lead: "Capa de referência",
              sponsored: "Publieditorial",
              latest: "Notícias recentes",
              featured: "Destaques",
              category: "Categoria",
              banner: "Publicidade",
              text: "Texto editorial",
              image: "Imagem com link",
              video: "Vídeo",
            }[section.type]
          }
        </strong>
        <button type="button" className="button-ghost danger" onClick={remove}>
          Remover
        </button>
      </div>
      <label>
        Título da seção
        <input
          value={section.title}
          onChange={(e) => update({ ...section, title: e.target.value })}
        />
      </label>
      <div className="form-columns">
        <label>
          Largura
          <select
            value={section.layoutWidth || "full"}
            onChange={(e) =>
              update({
                ...section,
                layoutWidth: e.target.value as Section["layoutWidth"],
              })
            }
          >
            <option value="full">Página inteira</option>
            <option value="half">Metade</option>
            <option value="third">Um terço</option>
          </select>
        </label>
        <label>
          Espaçamento
          <input
            type="range"
            min="0"
            max="80"
            value={section.padding || 0}
            onChange={(e) =>
              update({ ...section, padding: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <div className="form-columns">
        <label>
          Fundo da seção
          <input
            type="color"
            value={section.backgroundColor || "#ffffff"}
            onChange={(e) =>
              update({ ...section, backgroundColor: e.target.value })
            }
          />
        </label>
        <label>
          Cor da tipografia
          <input
            type="color"
            value={section.textColor || "#21152e"}
            onChange={(e) => update({ ...section, textColor: e.target.value })}
          />
        </label>
      </div>
      {section.type === "video" && (
        <label>
          Link do vídeo
          <input
            type="url"
            value={section.videoUrl || ""}
            placeholder="YouTube ou arquivo MP4"
            onChange={(e) => update({ ...section, videoUrl: e.target.value })}
          />
        </label>
      )}
      {section.type === "banner" && (
        <label>
          Formato do anúncio
          <select
            value={section.adFormat || "billboard"}
            onChange={(e) =>
              update({
                ...section,
                adFormat: e.target.value as Section["adFormat"],
              })
            }
          >
            {[
              ["billboard", "Painel amplo · 970 × 250"],
              ["leaderboard", "Faixa · 728 × 90"],
              ["rectangle", "Retângulo · 300 × 250"],
              ["skyscraper", "Vertical · 300 × 600"],
              ["square", "Quadrado · 300 × 300"],
              ["native", "Conteúdo patrocinado"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}
      {section.type === "category" && (
        <label>
          Categoria
          <select
            aria-label="Categoria da seção"
            value={section.categoryId || ""}
            onChange={(e) => update({ ...section, categoryId: e.target.value })}
          >
            <option value="">Escolha uma categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {["featured", "lead", "sponsored"].includes(section.type) && (
        <label>
          Notícias em destaque
          <select
            aria-label="Notícias da seção"
            multiple
            value={section.articleIds || []}
            onChange={(e) =>
              update({
                ...section,
                articleIds: Array.from(e.target.selectedOptions).map(
                  (o) => o.value,
                ),
              })
            }
          >
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <small>
            Use Ctrl/Cmd para selecionar mais de uma. Em publieditorial, a
            primeira notícia é usada.
          </small>
        </label>
      )}
      {["text", "sponsored"].includes(section.type) && (
        <textarea
          aria-label="Texto da seção"
          value={section.text || ""}
          onChange={(e) => update({ ...section, text: e.target.value })}
        />
      )}
      {["image", "sponsored", "banner"].includes(section.type) && (
        <>
          <MediaInput
            portalId={portalId}
            value={section.image}
            name={`image-${section.id}`}
            onChange={(image) => update({ ...section, image })}
          />
          <label>
            Link
            <input
              value={section.link || ""}
              onChange={(e) => update({ ...section, link: e.target.value })}
            />
          </label>
        </>
      )}
      {section.type === "category" && (
        <>
          <label>
            Composição da editoria
            <select
              aria-label="Composição da editoria"
              value={section.layout || "news"}
              onChange={(e) =>
                update({
                  ...section,
                  layout: e.target.value as "news" | "magazine",
                })
              }
            >
              <option value="news">Mosaico de notícias</option>
              <option value="magazine">Revista / entretenimento</option>
            </select>
          </label>
          <details className="section-details">
            <summary>Patrocínio da editoria</summary>
            <label>
              Cor da faixa do patrocinador
              <input
                type="color"
                value={section.sponsorColor || "#ff9428"}
                onChange={(e) =>
                  update({ ...section, sponsorColor: e.target.value })
                }
              />
            </label>
            <label>
              Nome do patrocinador
              <input
                value={section.sponsorName || ""}
                onChange={(e) =>
                  update({ ...section, sponsorName: e.target.value })
                }
              />
            </label>
            <MediaInput
              portalId={portalId}
              name={`sponsor-${section.id}`}
              label="Marca do patrocinador"
              value={section.sponsorLogo}
              onChange={(sponsorLogo) => update({ ...section, sponsorLogo })}
            />
            <label>
              Link do patrocinador
              <input
                value={section.sponsorLink || ""}
                onChange={(e) =>
                  update({ ...section, sponsorLink: e.target.value })
                }
              />
            </label>
          </details>
        </>
      )}
      {["banner", "category"].includes(section.type) && (
        <label>
          Posição da publicidade
          <select
            aria-label="Posição da publicidade"
            value={section.position || "header"}
            onChange={(e) =>
              update({
                ...section,
                position: e.target.value as Section["position"],
              })
            }
          >
            {[
              ["header", "Cabeçalho"],
              ["sidebar", "Lateral da capa"],
              ["between", "Entre editorias"],
              ["category", "Ao lado da editoria"],
              ["sponsored", "Ao lado do publieditorial"],
              ["footer", "Rodapé"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
function CanvasSection({
  section,
  children,
  onDrop,
  onEdit,
}: {
  section: Section;
  children: React.ReactNode;
  onDrop: (event: DragEvent, id?: string) => void;
  onEdit: () => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: `canvas-${section.id}` });
  return (
    <div
      ref={setNodeRef}
      className="canvas-section"
      data-section-id={section.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: `span ${section.layoutWidth === "half" ? 6 : section.layoutWidth === "third" ? 4 : 12}`,
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, section.id)}
    >
      <div className="canvas-section-tools">
        <button
          type="button"
          className="drag-handle"
          aria-label="Mover bloco na página"
          {...attributes}
          {...listeners}
        >
          ⠿ Mover
        </button>
        <button type="button" className="button-ghost" onClick={onEdit}>
          Editar seção
        </button>
      </div>
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a"))
            event.preventDefault();
        }}
      >
        {children}
      </div>
    </div>
  );
}
export function HomeBuilder({
  portalId,
  portal,
  initial,
  categories,
  articles,
  campaigns,
  partners,
  media = [],
  draftDesign,
}: {
  portalId: string;
  portal: Portal;
  initial: Section[];
  categories: Category[];
  articles: Article[];
  campaigns: Campaign[];
  partners: Partner[];
  media?: { id: string; name: string; url: string }[];
  draftDesign?: {
    settings?: Portal["settings"];
    template?: Portal["template"];
  };
}) {
  const baseDesign = presentationSettings(
    { ...portal.settings, ...draftDesign?.settings },
    draftDesign?.template || portal.template,
  );
  const [design, setDesign] = useState({
    color: baseDesign.color!,
    accentColor: baseDesign.accentColor!,
    surfaceColor: baseDesign.surfaceColor!,
    textColor: baseDesign.textColor!,
    font: baseDesign.font || "sans",
  });
  const [template, setTemplate] = useState<Portal["template"]>(
    draftDesign?.template || portal.template,
  );
  const [dropError, setDropError] = useState(""),
    [uploading, setUploading] = useState(false),
    [device, setDevice] = useState("desktop");
  const previewPortal = {
    ...portal,
    template,
    settings: { ...portal.settings, ...design },
  };
  function add(
    type: Section["type"],
    before?: string,
    extra: Partial<Section> = {},
  ) {
    if (sections.length >= 30) {
      setDropError("Use até 30 seções por página.");
      return;
    }
    const section = { id: crypto.randomUUID(), type, title: "", ...extra };
    setSections((items) => {
      const index = before ? items.findIndex((s) => s.id === before) : -1;
      return index < 0
        ? [...items, section]
        : [...items.slice(0, index), section, ...items.slice(index)];
    });
  }
  async function drop(event: DragEvent, before?: string) {
    event.preventDefault();
    event.stopPropagation();
    setDropError("");
    const file = event.dataTransfer.files[0];
    if (file) {
      setUploading(true);
      const form = new FormData();
      form.set("portal_id", portalId);
      form.set("file", file);
      try {
        const result = await uploadMedia(form);
        if (result.url) add("image", before, { image: result.url });
        else setDropError(result.error || "Não foi possível enviar a imagem.");
      } finally {
        setUploading(false);
      }
      return;
    }
    const image = event.dataTransfer.getData("application/x-influente-image");
    if (image) {
      add("image", before, { image });
      return;
    }
    const type = event.dataTransfer.getData("application/x-influente-block");
    if (
      [
        "lead",
        "latest",
        "featured",
        "category",
        "sponsored",
        "banner",
        "text",
        "image",
        "video",
      ].includes(type)
    )
      add(type as Section["type"], before);
  }
  const [sections, setSections] = useState(
    initial.length ? initial : referenceSections(categories,portal.template),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function move({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id)
      setSections((items) =>
        arrayMove(
          items,
          items.findIndex(
            (i) => i.id === String(active.id).replace(/^canvas-/, ""),
          ),
          items.findIndex(
            (i) => i.id === String(over.id).replace(/^canvas-/, ""),
          ),
        ),
      );
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={move}
    >
      <div className="homepage-editor">
        <section className="panel visual-design-bar">
          <h2>Seu portal, do seu jeito</h2>
          <p>
            Arraste blocos ou imagens para a página. Use Mover para organizar e
            Editar seção para configurar.
          </p>
          <div className="form-columns">
            <label>
              Tema
              <select
                aria-label="Tema do editor visual"
                value={template}
                onChange={(e) =>
                  setTemplate(e.target.value as Portal["template"])
                }
              >
                <option value="classic">Influente News</option>
                <option value="modern">Revista Influente</option>
                <option value="daily">Jornal Diário</option>
              </select>
            </label>
            <label>
              Visualização
              <select
                aria-label="Tamanho da prévia"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
              >
                <option value="desktop">Computador</option>
                <option value="mobile">Celular</option>
              </select>
            </label>
          </div>
          <div className="visual-colors">
            {(
              [
                ["color", "Cor principal"],
                ["accentColor", "Destaques"],
                ["surfaceColor", "Fundo do portal"],
                ["textColor", "Texto do portal"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="color"
                  value={design[key]}
                  onChange={(e) =>
                    setDesign({ ...design, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        {dropError && (
          <p role="alert" className="notice">
            {dropError}
          </p>
        )}
        {uploading && <p role="status">Enviando imagem…</p>}
        <div className="builder-toolbar">
          {(
            [
              "lead",
              "latest",
              "featured",
              "category",
              "sponsored",
              "banner",
              "text",
              "image",
              "video",
            ] as const
          ).map((type) => (
            <button
              className="button-outline"
              type="button"
              key={type}
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  "application/x-influente-block",
                  type,
                )
              }
              onClick={() => add(type)}
            >
              +{" "}
              {
                {
                  lead: "Capa de referência",
                  sponsored: "Publieditorial",
                  latest: "Recentes",
                  featured: "Destaques",
                  category: "Categoria",
                  banner: "Banner",
                  text: "Texto",
                  image: "Imagem",
                  video: "Vídeo",
                }[type]
              }
            </button>
          ))}
          <button
            type="button"
            className="button-outline"
            onClick={() => {
              if (
                confirm(
                  "Substituir a composição no editor pela composição editorial? A versão pública só muda ao clicar Publicar homepage.",
                )
              )
                setSections(referenceSections(categories,template));
            }}
          >
            Usar composição editorial
          </button>
        </div>
        <div className="editor-grid">
          <form action={saveHomepage}>
            <input type="hidden" name="portal_id" value={portalId} />
            <input type="hidden" name="design" value={JSON.stringify(design)} />
            <input type="hidden" name="template" value={template} />
            <input
              type="hidden"
              name="sections"
              value={JSON.stringify(sections)}
            />

            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section) => (
                <Block
                  key={section.id}
                  section={section}
                  portalId={portalId}
                  categories={categories}
                  articles={articles}
                  update={(s) =>
                    setSections(
                      sections.map((item) => (item.id === s.id ? s : item)),
                    )
                  }
                  remove={() =>
                    setSections(sections.filter((s) => s.id !== section.id))
                  }
                />
              ))}
            </SortableContext>

            {!sections.length && (
              <div className="empty-state">
                <h3>Uma homepage com a sua cara</h3>
                <p>Adicione seções acima e arraste para organizar.</p>
              </div>
            )}
            <div className="form-actions">
              <SubmitButton>Salvar rascunho</SubmitButton>
              <button type="submit" name="intent" value="publish">
                Publicar homepage
              </button>
              <a
                className="text-link"
                href={`/painel/${portalId}/preview`}
                target="_blank"
                rel="noreferrer"
              >
                Prévia do rascunho salvo ↗
              </a>
            </div>
          </form>
          <aside className="panel builder-preview">
            <p className="eyebrow">PRÉVIA EM TEMPO REAL</p>
            {media.length > 0 && (
              <details>
                <summary>Arrastar da biblioteca</summary>
                <div className="visual-media-library">
                  {media.map((image) => (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={image.name}
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData(
                          "application/x-influente-image",
                          image.url,
                        )
                      }
                    />
                  ))}
                </div>
              </details>
            )}
            <div
              className={`live-preview-stage visual-canvas ${device}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => void drop(event)}
            >
              <NewsShell
                portal={previewPortal}
                categories={categories}
                campaigns={campaigns}
                partners={partners}
                basePath={`/p/${portal.slug}`}
                preview
              >
                <div className="canvas-grid">
                  <SortableContext
                    items={sections.map((s) => `canvas-${s.id}`)}
                    strategy={rectSortingStrategy}
                  >
                    {sections.map((section) => (
                      <CanvasSection
                        key={section.id}
                        section={section}
                        onDrop={(event, id) => void drop(event, id)}
                        onEdit={() =>
                          document
                            .getElementById(`block-${section.id}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            })
                        }
                      >
                        <Homepage
                          portal={previewPortal}
                          articles={articles}
                          categories={categories}
                          campaigns={campaigns}
                          basePath={`/p/${portal.slug}`}
                          sections={[{ ...section, layoutWidth: "full" }]}
                        />
                      </CanvasSection>
                    ))}
                  </SortableContext>
                </div>
                <div className="canvas-drop-end">
                  Solte uma imagem ou um bloco aqui
                </div>
              </NewsShell>
            </div>
            <small>
              As alterações aparecem aqui antes de salvar. A prévia privada
              inclui rascunhos. Abra a versão salva para visualizar em tamanho
              real.
            </small>
          </aside>
        </div>
      </div>
    </DndContext>
  );
}
