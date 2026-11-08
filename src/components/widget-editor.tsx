"use client";
import type { Experience } from "@/lib/experience";
import type { WidgetKind } from "@/lib/widgets";
import { MediaInput } from "./media-input";
export function WidgetEditor({
  kind,
  value,
  portalId,
  sections = [],
  onChange,
}: {
  kind: WidgetKind;
  value: Experience;
  portalId: string;
  sections?: { id: string; title?: string; type?: string }[];
  onChange: (key: string, v: unknown) => void;
}) {
  const c = (value[kind] || {}) as Record<string, unknown>;
  const field = (key: string, label: string, fallback = "", type = "text") => (
    <label>
      {label}
      <input
        type={type}
        aria-label={label}
        min={
          type === "number"
            ? key === "maxWidth"
              ? 200
              : key === "height"
                ? 30
                : 0
            : undefined
        }
        max={
          type === "number"
            ? key === "maxWidth"
              ? 1600
              : key === "height"
                ? 90
                : key === "radius"
                  ? 80
                  : 100
            : undefined
        }
        value={String(c[key] ?? fallback)}
        onChange={(e) =>
          onChange(
            key,
            type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
      />
    </label>
  );
  const check = (key: string, label: string, fallback = true) => (
    <label className="check-label">
      <input
        type="checkbox"
        checked={Boolean(c[key] ?? fallback)}
        onChange={(e) => onChange(key, e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <div className="widget-controls">
      {check("enabled", "Exibir este bloco")}
      <div className="form-columns">
        <label>
          Local do bloco
          <select
            aria-label="Local do bloco"
            value={String(c.position || "default")}
            onChange={(e) => onChange("position", e.target.value)}
          >
            {[
              ["default", "Posição original do tema"],
              ["header", "Logo abaixo do cabeçalho"],
              ["before-content", "Antes do conteúdo"],
              ["before-section", "Antes de uma seção"],
              ["after-section", "Depois de uma seção"],
              ["after-content", "Depois do conteúdo"],
              ["before-footer", "Antes do rodapé"],
              ["footer", "Dentro do rodapé"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {kind === "search" && (v === "default" || v === "header")
                  ? "No cabeçalho"
                  : t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alinhamento do bloco
          <select
            aria-label="Alinhamento do bloco"
            value={String(c.align || "center")}
            onChange={(e) => onChange("align", e.target.value)}
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </label>
      </div>
      {(c.position === "before-section" || c.position === "after-section") && (
        <label>
          Seção de referência
          <select
            aria-label="Seção de referência"
            value={String(c.sectionId || "")}
            onChange={(e) => onChange("sectionId", e.target.value)}
          >
            <option value="">Selecione uma seção</option>
            {sections.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {s.title || s.type || "Seção"}
              </option>
            ))}
          </select>
          <small className="field-hint">
            Se a seção for removida, o bloco vai para depois do conteúdo. Nas
            outras páginas, ele aparece depois do conteúdo.
          </small>
        </label>
      )}
      <label>
        Conteúdo do bloco
        <select
          aria-label="Conteúdo do bloco"
          value={String(c.contentType || "content")}
          onChange={(e) => onChange("contentType", e.target.value)}
        >
          <option value="content">
            {kind === "search"
              ? "Campo de busca"
              : kind === "commercial"
                ? "Texto, imagem e vídeo"
                : "Formulário e textos"}
          </option>
          <option value="image">Somente imagem com link</option>
        </select>
      </label>
      {c.contentType === "image" ? (
        <>
          <MediaInput
            portalId={portalId}
            name={`${kind}-widget-image`}
            label="Imagem do bloco"
            value={String(c.image || "")}
            onChange={(v) => onChange("image", v)}
          />
          {field("imageLink", "Link da imagem")}
          {field("imageAlt", "Descrição da imagem")}
        </>
      ) : (
        <>
          {kind === "commercial" && (
            <>
              {field("title", "Título da chamada comercial")}
              <label>
                Texto da chamada comercial
                <textarea
                  aria-label="Texto da chamada comercial"
                  value={String(c.body ?? "")}
                  onChange={(e) => onChange("body", e.target.value)}
                />
              </label>
              {field(
                "buttonLabel",
                "Texto do link comercial",
                "Conheça as oportunidades",
              )}
              {field("link", "Destino da chamada comercial")}
              <MediaInput
                portalId={portalId}
                name="commercial-widget-art"
                label="Imagem adicional da chamada"
                value={String(c.image || "")}
                onChange={(v) => onChange("image", v)}
              />
              {field("video", "Vídeo da chamada comercial")}
              {check("showContacts", "Exibir contatos comerciais")}
            </>
          )}
          {kind === "newsletter" && (
            <>
              {check("showForm", "Mostrar inscrição por e-mail")}
              {check("showWhatsapp", "Mostrar chamada do WhatsApp")}
              {field(
                "title",
                "Título das novidades",
                "Receba novidades por e-mail",
              )}
              {field("description", "Descrição das novidades")}
              {field(
                "placeholder",
                "Texto dentro do campo de e-mail",
                "Seu e-mail",
              )}
              {field("buttonLabel", "Texto do botão de inscrição", "Assinar")}
              {field(
                "consentText",
                "Texto de consentimento da inscrição",
                "Quero receber novidades por e-mail.",
              )}
            </>
          )}
          {kind === "search" && (
            <>
              <label>
                Design da busca
                <select
                  aria-label="Design da busca"
                  value={String(c.preset ?? "outline")}
                  onChange={(e) => onChange("preset", e.target.value)}
                >
                  <option value="outline">Contorno leve</option>
                  <option value="filled">Caixa preenchida</option>
                  <option value="minimal">Linha discreta</option>
                  <option value="pill">Cantos arredondados</option>
                </select>
              </label>
              {check("customStyle", "Personalizar cores da busca", false)}
              {field(
                "placeholder",
                "Texto dentro da busca",
                "O que você procura?",
              )}
              {field("buttonLabel", "Texto do botão de busca", "Buscar")}
              {field("height", "Altura da busca", "40", "number")}
            </>
          )}
        </>
      )}
      <details className="settings-disclosure">
        <summary>Dimensões e cores do bloco</summary>
        <div className="form-columns">
          {field("maxWidth", "Largura máxima do bloco", "640", "number")}
          {field("padding", "Espaçamento interno do bloco", "20", "number")}
          {field("radius", "Cantos do bloco", "12", "number")}
          {field("background", "Fundo do bloco", "#ffffff", "color")}
          {field("color", "Texto do bloco", "#17342a", "color")}
          {(kind === "newsletter" || kind === "search") && (
            <>
              {field(
                "buttonColor",
                "Fundo do botão do bloco",
                "#285c45",
                "color",
              )}
              {field(
                "buttonTextColor",
                "Cor do botão do bloco",
                "#ffffff",
                "color",
              )}
              {field(
                "inputBackground",
                "Fundo do campo do bloco",
                "#ffffff",
                "color",
              )}
              {field(
                "inputColor",
                "Texto do campo do bloco",
                "#17342a",
                "color",
              )}
            </>
          )}
        </div>
      </details>
    </div>
  );
}
