"use client";
import { useState } from "react";
import { referenceSections } from "@/lib/presentation";
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
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveHomepage } from "@/app/painel/actions";
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
      {["image", "sponsored"].includes(section.type) && (
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
export function HomeBuilder({
  portalId,
  portal,
  initial,
  categories,
  articles,
  campaigns,
  partners,
}: {
  portalId: string;
  portal: Portal;
  initial: Section[];
  categories: Category[];
  articles: Article[];
  campaigns: Campaign[];
  partners: Partner[];
}) {
  const [sections, setSections] = useState(
    initial.length ? initial : referenceSections(categories),
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
          items.findIndex((i) => i.id === active.id),
          items.findIndex((i) => i.id === over.id),
        ),
      );
  }
  return (
    <div className="homepage-editor">
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
          ] as const
        ).map((type) => (
          <button
            className="button-outline"
            type="button"
            key={type}
            onClick={() =>
              setSections([
                ...sections,
                { id: crypto.randomUUID(), type, title: "" },
              ])
            }
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
                "Substituir a composição no editor pela estrutura do PDF? A versão pública só muda ao clicar Publicar homepage.",
              )
            )
              setSections(referenceSections(categories));
          }}
        >
          Usar estrutura do PDF
        </button>
      </div>
      <div className="editor-grid">
        <form action={saveHomepage}>
          <input type="hidden" name="portal_id" value={portalId} />
          <input
            type="hidden"
            name="sections"
            value={JSON.stringify(sections)}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={move}
          >
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
          </DndContext>
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
          <div className="live-preview-stage">
            <NewsShell
              portal={portal}
              categories={categories}
              campaigns={campaigns}
              partners={partners}
              basePath={`/p/${portal.slug}`}
              preview
            >
              <Homepage
                portal={portal}
                articles={articles}
                categories={categories}
                campaigns={campaigns}
                basePath={`/p/${portal.slug}`}
                sections={sections}
              />
            </NewsShell>
          </div>
          <small>
            As alterações aparecem aqui antes de salvar. A prévia privada inclui
            rascunhos. Abra a versão salva para visualizar em tamanho real.
          </small>
        </aside>
      </div>
    </div>
  );
}
