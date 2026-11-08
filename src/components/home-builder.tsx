"use client";
import { AdvertisingEditor } from "./advertising-editor";
import { AdSlotEditor } from "./ad-slot-editor";
import {
  referenceAdSlots,
  type AdSlot,
  type Advertising,
} from "@/lib/advertising";
import { widgetKinds, widgetNames, type WidgetKind } from "@/lib/widgets";
import { ExperienceEditor, type ExperienceTab } from "./experience-editor";
import { MenuEditor } from "./menu-editor";
import type { Experience, MenuItem } from "@/lib/experience";
import { campaignMatches } from "@/lib/experience";
import { useState, useEffect, type DragEvent } from "react";
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
  campaigns,
}: {
  section: Section;
  update: (v: Section) => void;
  remove: () => void;
  categories: Category[];
  articles: Article[];
  portalId: string;
  campaigns: Campaign[];
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
      <AdSlotEditor section={section} update={update} campaigns={campaigns} />
      <fieldset className="section-style-inspector" data-edit-control="title">
        <legend>Título desta seção</legend>
        <div className="form-columns">
          <label>
            Cor do título
            <input
              type="color"
              aria-label="Cor do cabeçalho da seção"
              value={section.titleColor || "#17382b"}
              onChange={(e) =>
                update({ ...section, titleColor: e.target.value })
              }
            />
          </label>
          <label>
            Fundo só do título
            <input
              type="color"
              aria-label="Fundo só do título"
              value={section.titleBackground || "#ffffff"}
              onChange={(e) =>
                update({ ...section, titleBackground: e.target.value })
              }
            />
          </label>
          <label>
            Tamanho do título
            <input
              type="number"
              min="14"
              max="72"
              value={section.titleSize || 28}
              onChange={(e) =>
                update({ ...section, titleSize: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="button-ghost small"
          onClick={() =>
            update({
              ...section,
              titleColor: undefined,
              titleBackground: undefined,
              titleSize: undefined,
            })
          }
        >
          Restaurar estilo do título
        </button>
      </fieldset>
      <fieldset className="section-style-inspector" data-edit-control="copy">
        <legend>Textos e cartões desta seção</legend>
        <div className="form-columns">
          <label>
            Cor da copy
            <input
              type="color"
              value={section.copyColor || section.textColor || "#17252a"}
              onChange={(e) =>
                update({ ...section, copyColor: e.target.value })
              }
            />
          </label>
          <label>
            Fundo dos cartões
            <input
              type="color"
              value={section.cardBackground || "#ffffff"}
              onChange={(e) =>
                update({ ...section, cardBackground: e.target.value })
              }
            />
          </label>
          <label>
            Tamanho da copy
            <input
              type="number"
              min="12"
              max="36"
              value={section.copySize || 16}
              onChange={(e) =>
                update({ ...section, copySize: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Alinhamento da seção
            <select
              value={section.align || "left"}
              onChange={(e) =>
                update({
                  ...section,
                  align: e.target.value as Section["align"],
                })
              }
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </label>
          <label>
            Cantos da seção
            <input
              type="number"
              min="0"
              max="40"
              value={section.radius || 0}
              onChange={(e) =>
                update({ ...section, radius: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="button-ghost small"
          onClick={() =>
            update({
              ...section,
              copyColor: undefined,
              cardBackground: undefined,
              copySize: undefined,
              align: undefined,
              radius: undefined,
            })
          }
        >
          Restaurar estilo dos textos
        </button>
      </fieldset>
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
      {section.type === "banner" && (
        <label>
          Usar uma campanha
          <select
            aria-label="Campanha desta seção"
            value={section.campaignId || ""}
            onChange={(e) => update({ ...section, campaignId: e.target.value })}
          >
            <option value="">Peça própria ou posição padrão</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {["banner", "sponsored"].includes(section.type) && (
        <label>
          Vídeo da publicidade
          <input
            type="url"
            value={section.videoUrl || ""}
            onChange={(e) => update({ ...section, videoUrl: e.target.value })}
            placeholder="YouTube ou arquivo MP4/WebM"
          />
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
  onEdit: (part?: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: `canvas-${section.id}` });
  return (
    <div
      ref={setNodeRef}
      className="canvas-section"
      data-section-type={section.type}
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
        <button type="button" className="button-ghost" onClick={() => onEdit()}>
          Editar seção
        </button>
      </div>
      <div
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (
            target
              .closest(".canvas-section")
              ?.getAttribute("data-section-id") !== section.id
          )
            return;
          if (target.closest("a")) event.preventDefault();
          if (
            !target.closest("button,input,select,textarea,summary,video,iframe")
          )
            onEdit(
              target.closest(".portal-ad-slot")
                ? "ads"
                : target.closest(".block-title,.editoria-heading")
                  ? "title"
                  : target.closest("p,.editorial-text,.news-card,.daily-hero")
                    ? "copy"
                    : "background",
            );
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
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        setFullscreen(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [fullscreen]);
  const [dropError, setDropError] = useState(""),
    [uploading, setUploading] = useState(false),
    [device, setDevice] = useState("desktop");
  const [experience, setExperience] = useState<Experience>(
      baseDesign.experience || {},
    ),
    [experienceTab, setExperienceTab] = useState<ExperienceTab>("navigation"),
    [menus, setMenus] = useState<MenuItem[]>(baseDesign.menus || []),
    [menusMode, setMenusMode] = useState<"auto" | "custom">(
      baseDesign.menusMode || "auto",
    );
  const [inspectorTab, setInspectorTab] = useState<"blocks" | "design" | "ads">(
    "blocks",
  );
  const [selectedSection, setSelectedSection] = useState(initial[0]?.id || "");
  const [advertising, setAdvertising] = useState<Advertising>(
    baseDesign.advertising || {},
  );
  function inspect(id: string, part = "background") {
    setSelectedSection(id);
    setInspectorTab("blocks");
    requestAnimationFrame(() => {
      const block = document.getElementById(`block-${id}`);
      document
        .querySelectorAll(".builder-block.is-inspecting")
        .forEach((node) => node.classList.remove("is-inspecting"));
      block?.classList.add("is-inspecting");
      const control =
        block?.querySelector(`[data-edit-control="${part}"]`) || block;
      control?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
  const previewCampaigns = campaigns.filter((campaign) =>
    campaignMatches(campaign.creative, { kind: "home" }),
  );
  const previewPortal = {
    ...portal,
    template,
    settings: {
      ...portal.settings,
      ...design,
      advertising,
      experience,
      menus,
      menusMode,
    },
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
    const id = crypto.randomUUID();
    const section = {
      id,
      type,
      title: "",
      adSlots: referenceAdSlots(type, id),
      ...extra,
    };
    setSelectedSection(section.id);
    setInspectorTab("blocks");
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
    const widget = event.dataTransfer.getData("application/x-influente-widget");
    if (widgetKinds.includes(widget as WidgetKind)) {
      const region = (event.target as HTMLElement)
        .closest("[data-utility-location]")
        ?.getAttribute("data-utility-location");
      const anchor =
        before ||
        (event.target as HTMLElement)
          .closest("[data-section-id]")
          ?.getAttribute("data-section-id");
      const position = anchor ? "before-section" : region || "after-content";
      setExperience((current) => ({
        ...current,
        [widget]: {
          ...current[widget as WidgetKind],
          enabled: true,
          position,
          sectionId: anchor || "",
        },
      }));
      setExperienceTab(widget as ExperienceTab);
      setInspectorTab("design");
      return;
    }
    const adKind = event.dataTransfer.getData(
      "application/x-influente-ad-kind",
    );
    const moved = event.dataTransfer.getData("application/x-influente-slot");
    const zone = ((event.target as HTMLElement)
      .closest("[data-ad-zone]")
      ?.getAttribute("data-ad-zone") || "after") as AdSlot["zone"];
    const beforeSlotId = (event.target as HTMLElement)
      .closest("[data-ad-slot-id]")
      ?.getAttribute("data-ad-slot-id");
    const target = before || sections.at(-1)?.id;
    if ((adKind || moved) && target) {
      if (moved) {
        try {
          const source = JSON.parse(moved);
          let slot: AdSlot | undefined;
          for (const section of sections)
            slot ||= section.adSlots?.find((s) => s.id === source.id);
          if (slot) {
            const placed = { ...slot, zone };
            setSections((items) =>
              items.map((s) => {
                const next = (s.adSlots || []).filter((a) => a.id !== slot!.id);
                if (s.id === target) {
                  const index = next.findIndex((a) => a.id === beforeSlotId);
                  next.splice(index < 0 ? next.length : index, 0, placed);
                }
                return { ...s, adSlots: next };
              }),
            );
            inspect(target);
          }
        } catch {
          setDropError("Não foi possível mover este espaço.");
        }
        return;
      }
      if (["advertising", "google", "sponsor"].includes(adKind)) {
        setSections((items) =>
          items.map((s) =>
            s.id === target
              ? {
                  ...s,
                  adSlots: [
                    ...(s.adSlots || []),
                    {
                      id: crypto.randomUUID(),
                      kind: adKind as AdSlot["kind"],
                      zone,
                      format: (adKind === "sponsor"
                        ? "sponsor"
                        : "rectangle") as AdSlot["format"],
                    },
                  ].slice(0, 10),
                }
              : s,
          ),
        );
        inspect(target);
        return;
      }
    }
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
  const [sections, setSections] = useState<Section[]>(
    (initial.length
      ? initial
      : referenceSections(categories, portal.template)
    ).map((s) => ({
      ...s,
      adSlots: s.adSlots ?? referenceAdSlots(s.type, s.id),
    })),
  );
  useEffect(() => {
    if (!sections.some((s) => s.id === selectedSection))
      setSelectedSection(sections[0]?.id || "");
  }, [sections, selectedSection]);
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
      <div
        className={`homepage-editor ${fullscreen ? "builder-fullscreen" : ""}`}
      >
        <section className="panel visual-design-bar">
          <div className="builder-heading-row">
            <h2>Seu portal, do seu jeito</h2>
            <button
              type="button"
              className="button-outline"
              onClick={() => setFullscreen(!fullscreen)}
            >
              {fullscreen ? "Sair da tela cheia" : "Editar em tela cheia"}
            </button>
          </div>
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
        <div className="utility-builder-palette">
          <div>
            <strong>Blocos do portal</strong>
            <p>
              Arraste para uma seção ou clique para editar textos, posição e
              visibilidade.
            </p>
          </div>
          {widgetKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className="button-outline"
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  "application/x-influente-widget",
                  kind,
                )
              }
              onClick={() => {
                setExperienceTab(kind);
                setInspectorTab("design");
                document
                  .getElementById("portal-experience-controls")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {widgetNames[kind]}
            </button>
          ))}
        </div>
        <div className="ad-builder-palette">
          <div>
            <strong>Espaços de monetização</strong>
            <span>
              Arraste para antes, título, lateral ou depois de uma seção.
            </span>
          </div>
          {(["advertising", "google", "sponsor"] as const).map((kind) => (
            <button
              type="button"
              className={`slot-palette slot-${kind}`}
              key={kind}
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData(
                  "application/x-influente-ad-kind",
                  kind,
                )
              }
              onClick={() => {
                const id = selectedSection || sections[0]?.id;
                if (id) {
                  setSections((items) =>
                    items.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            adSlots: [
                              ...(s.adSlots || []),
                              {
                                id: crypto.randomUUID(),
                                kind,
                                zone: kind === "sponsor" ? "heading" : "after",
                                format:
                                  kind === "sponsor" ? "sponsor" : "rectangle",
                              } as AdSlot,
                            ].slice(0, 10),
                          }
                        : s,
                    ),
                  );
                  inspect(id);
                }
              }}
            >
              {kind === "advertising"
                ? "Publicidade"
                : kind === "google"
                  ? "Google Ads"
                  : "Patrocinador"}
            </button>
          ))}
        </div>
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
                setSections(
                  referenceSections(categories, template).map((s) => ({
                    ...s,
                    adSlots: referenceAdSlots(s.type, s.id),
                  })),
                );
            }}
          >
            Usar composição editorial
          </button>
        </div>
        <div className="editor-grid">
          <form action={saveHomepage} className="builder-inspector">
            <div
              className="builder-inspector-tabs"
              role="tablist"
              aria-label="Ferramentas do editor"
            >
              {(["blocks", "design", "ads"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === t}
                  onClick={() => setInspectorTab(t)}
                >
                  {t === "blocks"
                    ? "Seções"
                    : t === "design"
                      ? "Identidade"
                      : "Monetização"}
                </button>
              ))}
            </div>
            <div hidden={inspectorTab !== "ads"}>
              <AdvertisingEditor
                name=""
                value={advertising}
                onChange={setAdvertising}
              />
            </div>
            <div hidden={inspectorTab !== "design"}>
              <ExperienceEditor
                portalId={portalId}
                sections={sections}
                value={experience}
                onChange={setExperience}
                tab={experienceTab}
                onTabChange={setExperienceTab}
                name=""
              />
              {experienceTab === "navigation" && (
                <section className="panel">
                  <h3>Itens e submenus</h3>
                  <label>
                    Organização do menu
                    <select
                      value={menusMode}
                      onChange={(e) =>
                        setMenusMode(e.target.value as "auto" | "custom")
                      }
                    >
                      <option value="auto">
                        Categorias e links escolhidos
                      </option>
                      <option value="custom">
                        Somente os itens que eu criar
                      </option>
                    </select>
                  </label>
                  <MenuEditor name="" value={menus} onChange={setMenus} />
                </section>
              )}
            </div>
            <div
              className="section-navigator"
              hidden={inspectorTab !== "blocks"}
            >
              <p className="eyebrow">ESTRUTURA DA PÁGINA</p>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className={selectedSection === s.id ? "selected" : ""}
                >
                  <button type="button" onClick={() => inspect(s.id)}>
                    {i + 1}.{" "}
                    {s.title ||
                      {
                        lead: "Capa",
                        latest: "Recentes",
                        category: "Editoria",
                        banner: "Anúncio",
                        sponsored: "Publieditorial",
                        text: "Texto",
                        image: "Imagem",
                        video: "Vídeo",
                        featured: "Destaques",
                      }[s.type]}
                  </button>
                  <button
                    type="button"
                    aria-label={`Subir seção ${i + 1}`}
                    disabled={i === 0}
                    onClick={() =>
                      setSections((items) => arrayMove(items, i, i - 1))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer seção ${i + 1}`}
                    disabled={i === sections.length - 1}
                    onClick={() =>
                      setSections((items) => arrayMove(items, i, i + 1))
                    }
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
            <input type="hidden" name="portal_id" value={portalId} />
            <input
              type="hidden"
              name="design"
              value={JSON.stringify({
                ...design,
                advertising,
                experience,
                menus,
                menusMode,
              })}
            />
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
                <div
                  key={section.id}
                  hidden={
                    inspectorTab !== "blocks" || selectedSection !== section.id
                  }
                >
                  <Block
                    campaigns={campaigns}
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
                </div>
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
              onClickCapture={(event) => {
                const target = event.target as HTMLElement;
                const region = target
                  .closest("[data-edit-region]")
                  ?.getAttribute("data-edit-region") as
                  ExperienceTab | undefined;
                if (
                  region &&
                  [
                    "navigation",
                    "contact",
                    "footer",
                    "partners",
                    "search",
                    "newsletter",
                    "commercial",
                  ].includes(region)
                ) {
                  setExperienceTab(region);
                  setInspectorTab("design");
                  document
                    .getElementById("portal-experience-controls")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                if (target.closest("a")) event.preventDefault();
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => void drop(event)}
            >
              <NewsShell
                portal={{ ...previewPortal, home_published: sections }}
                categories={categories}
                campaigns={previewCampaigns}
                partners={partners}
                basePath={`/p/${portal.slug}`}
                preview
              >
                <SortableContext
                  items={sections.map((s) => `canvas-${s.id}`)}
                  strategy={rectSortingStrategy}
                >
                  <Homepage
                    portal={previewPortal}
                    articles={articles}
                    categories={categories}
                    campaigns={previewCampaigns}
                    basePath={`/p/${portal.slug}`}
                    sections={sections}
                    preview
                    frame={(section, children) => (
                      <CanvasSection
                        key={section.id}
                        section={section}
                        onDrop={(event, id) => void drop(event, id)}
                        onEdit={(part) => inspect(section.id, part)}
                      >
                        {children}
                        <div className="canvas-ad-targets">
                          {(
                            ["before", "heading", "sidebar", "after"] as const
                          ).map((zone) => (
                            <div
                              key={zone}
                              data-ad-zone={zone}
                              className="canvas-ad-target"
                            >
                              {zone === "before"
                                ? "Antes"
                                : zone === "heading"
                                  ? "No título"
                                  : zone === "sidebar"
                                    ? "Lateral"
                                    : "Depois"}{" "}
                              · solte um anúncio
                            </div>
                          ))}
                        </div>
                      </CanvasSection>
                    )}
                  />
                </SortableContext>
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
