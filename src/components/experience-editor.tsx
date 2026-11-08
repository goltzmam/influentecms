"use client";
import { WidgetEditor } from "./widget-editor";
import { useState } from "react";
import type { Experience } from "@/lib/experience";
import { MediaInput } from "./media-input";
import { MenuEditor } from "./menu-editor";
export type ExperienceTab =
  | "navigation"
  | "contact"
  | "footer"
  | "partners"
  | "search"
  | "newsletter"
  | "commercial";
export function ExperienceEditor({
  portalId,
  sections = [],
  value = {},
  onChange,
  tab: controlledTab,
  onTabChange,
  name = "experience",
}: {
  portalId: string;
  sections?: { id: string; title?: string; type?: string }[];
  value?: Experience;
  onChange?: (value: Experience) => void;
  tab?: ExperienceTab;
  onTabChange?: (tab: ExperienceTab) => void;
  name?: string;
}) {
  const [local, setLocal] = useState(value),
    [localTab, setTab] = useState<ExperienceTab>("navigation");
  const data = onChange ? value : local,
    tab = controlledTab || localTab;
  function change<K extends keyof Experience>(
    group: K,
    key: string,
    v: unknown,
  ) {
    const next = { ...data, [group]: { ...data[group], [key]: v } };
    if (
      group === "navigation" &&
      ["background", "color", "accent"].includes(key)
    )
      next.navigation = { ...next.navigation, customColors: true };
    if (
      group === "search" &&
      [
        "background",
        "color",
        "buttonColor",
        "buttonTextColor",
        "inputBackground",
        "inputColor",
        "inputBorder",
      ].includes(key)
    )
      next.search = { ...next.search, customStyle: true };
    if (group === "navigation" && key === "density")
      next.navigation = {
        ...next.navigation,
        headerHeight: v === "comfortable" ? 108 : 84,
      };
    const legacy: Record<string, string> = {
      advertTitle: "title",
      advertLink: "link",
      advertImage: "image",
      advertVideo: "video",
      advertBackground: "background",
      advertColor: "color",
      showCommercial: "enabled",
    };
    if (group === "footer" && legacy[key])
      next.commercial = { ...data.commercial, [legacy[key]]: v };
    setLocal(next);
    onChange?.(next);
  }
  const select = (
    group: keyof Experience,
    key: string,
    label: string,
    options: [string, string][],
    fallback: string,
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={String(
          (data[group] as Record<string, unknown>)?.[key] ?? fallback,
        )}
        onChange={(e) => change(group, key, e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const color = (
    group: keyof Experience,
    key: string,
    label: string,
    fallback: string,
  ) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="color"
        value={String(
          (data[group] as Record<string, unknown>)?.[key] || fallback,
        )}
        onChange={(e) => change(group, key, e.target.value)}
      />
    </label>
  );
  const number = (
    group: keyof Experience,
    key: string,
    label: string,
    fallback: number,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={Number(
          (data[group] as Record<string, unknown>)?.[key] ?? fallback,
        )}
        onChange={(e) => change(group, key, Number(e.target.value))}
      />
    </label>
  );
  const text = (
    group: keyof Experience,
    key: string,
    label: string,
    fallback = "",
  ) => (
    <label>
      {label}
      <input
        value={String(
          (data[group] as Record<string, unknown>)?.[key] ?? fallback,
        )}
        onChange={(e) => change(group, key, e.target.value)}
      />
    </label>
  );
  const check = (
    group: keyof Experience,
    key: string,
    label: string,
    fallback = true,
  ) => (
    <label className="check-label">
      <input
        type="checkbox"
        checked={Boolean(
          (data[group] as Record<string, unknown>)?.[key] ?? fallback,
        )}
        onChange={(e) => change(group, key, e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <section
      className="panel experience-editor"
      id="portal-experience-controls"
    >
      <input
        type="hidden"
        name={name || undefined}
        value={JSON.stringify(data)}
      />
      <div className="section-title">
        <div>
          <p className="eyebrow">EXPERIÊNCIA DO PORTAL</p>
          <h2>Cada detalhe, do seu jeito</h2>
        </div>
      </div>
      <div
        className="segmented-tabs"
        role="tablist"
        aria-label="Partes do portal"
      >
        {(
          [
            ["navigation", "Menu"],
            ["contact", "Formulário"],
            ["footer", "Rodapé"],
            ["partners", "Parceiros"],
            ["search", "Busca"],
            ["newsletter", "Novidades"],
            ["commercial", "Chamada comercial"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              onTabChange?.(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {(tab === "search" || tab === "newsletter" || tab === "commercial") && (
        <div role="tabpanel">
          <h3>
            {tab === "search"
              ? "Busca do portal"
              : tab === "newsletter"
                ? "Inscrição e novidades"
                : "Chamada para anunciantes"}
          </h3>
          <WidgetEditor
            kind={tab}
            value={data}
            portalId={portalId}
            sections={sections}
            onChange={(key, v) => change(tab, key, v)}
          />
        </div>
      )}
      {tab === "navigation" && (
        <div role="tabpanel">
          <h3>Navegação que combina com seu portal</h3>
          <MediaInput
            portalId={portalId}
            name="header-logo-control"
            label="Marca exclusiva do cabeçalho"
            value={data.navigation?.logo}
            onChange={(v) => change("navigation", "logo", v)}
          />
          {check("navigation", "showLogo", "Mostrar a marca no cabeçalho")}
          {number(
            "navigation",
            "logoWidth",
            "Largura da marca do cabeçalho",
            180,
            50,
            600,
          )}
          {select(
            "navigation",
            "layout",
            "Formato do menu",
            [
              ["horizontal", "Somente menu horizontal"],
              ["burger", "Botão de menu com painel lateral"],
              ["sidebar", "Menu lateral"],
              ["hybrid", "Horizontal + botão de menu"],
              ["hidden", "Sem menu"],
            ],
            "horizontal",
          )}
          {check("navigation", "enabled", "Exibir navegação do portal")}
          {select(
            "navigation",
            "inlineStyle",
            "Distribuição dos links",
            [
              ["row", "Uma linha, com quebra automática"],
              ["distributed", "Links distribuídos na largura"],
              ["columns", "Colunas editoriais"],
            ],
            "row",
          )}
          {text("navigation", "menuLabel", "Texto do botão de menu", "Menu")}
          {select(
            "navigation",
            "density",
            "Tamanho do cabeçalho",
            [
              ["compact", "Compacto"],
              ["comfortable", "Mais espaçado"],
            ],
            "compact",
          )}
          {check("navigation", "shrinkOnScroll", "Encolher cabeçalho ao rolar")}
          {check(
            "navigation",
            "showTagline",
            "Mostrar assinatura no cabeçalho",
          )}
          <div className="form-columns">
            {number(
              "navigation",
              "headerHeight",
              "Altura do cabeçalho",
              84,
              64,
              140,
            )}
            {number(
              "navigation",
              "compactHeight",
              "Altura ao rolar",
              56,
              48,
              88,
            )}
          </div>
          <div className="form-columns">
            {select(
              "navigation",
              "logoAlign",
              "Posição da marca",
              [
                ["left", "À esquerda"],
                ["center", "Centralizada"],
              ],
              "left",
            )}
            {number(
              "navigation",
              "width",
              "Largura do menu lateral",
              350,
              240,
              500,
            )}
          </div>
          {check(
            "navigation",
            "customColors",
            "Usar cores específicas neste menu",
            false,
          )}
          <div className="form-columns">
            {color("navigation", "background", "Fundo do menu", "#ffffff")}
            {color("navigation", "color", "Texto do menu", "#17252a")}
            {color("navigation", "accent", "Destaque dos links", "#285c45")}
          </div>
          {check(
            "navigation",
            "sticky",
            "Manter o menu visível ao rolar",
            true,
          )}
          <p className="field-hint">
            Os itens e submenus são organizados em Menu de navegação, logo
            abaixo. No celular o menu se adapta automaticamente.
          </p>
        </div>
      )}
      {tab === "contact" && (
        <div role="tabpanel">
          <h3>Um contato leve, sem ocupar a página inteira</h3>
          {select(
            "contact",
            "mode",
            "Formato do formulário",
            [
              ["compact", "Cartão compacto expansível"],
              ["inline", "Aberto na página"],
              ["drawer", "Botão que abre o formulário"],
              ["hidden", "Não exibir"],
            ],
            "compact",
          )}
          <WidgetEditor
            kind="contact"
            value={data}
            portalId={portalId}
            sections={sections}
            onChange={(key, v) => change("contact", key, v)}
          />
          {text(
            "contact",
            "title",
            "Título do formulário de contato",
            "Fale com a redação",
          )}
          {text(
            "contact",
            "intro",
            "Apresentação do formulário",
            "Converse com a nossa equipe.",
          )}
          {text(
            "contact",
            "buttonLabel",
            "Texto do botão de envio",
            "Enviar mensagem",
          )}
          <div className="form-columns">
            {number(
              "contact",
              "maxWidth",
              "Largura máxima do formulário",
              640,
              280,
              1200,
            )}
            {select(
              "contact",
              "columns",
              "Distribuição dos campos",
              [
                ["one", "Uma coluna"],
                ["two", "Duas colunas"],
              ],
              "two",
            )}
            {number(
              "contact",
              "messageRows",
              "Altura da mensagem em linhas",
              3,
              2,
              12,
            )}
            {number(
              "contact",
              "padding",
              "Espaço interno do formulário",
              24,
              8,
              64,
            )}
            {number("contact", "radius", "Cantos do formulário", 16, 0, 40)}
          </div>
          <div className="form-columns">
            {color("contact", "background", "Fundo do formulário", "#ffffff")}
            {color("contact", "color", "Texto do formulário", "#17252a")}
            {color(
              "contact",
              "buttonColor",
              "Cor do botão de envio",
              "#285c45",
            )}
          </div>
          <fieldset className="optional-fields">
            <legend>Campos opcionais</legend>
            {(
              [
                ["address", "Endereço"],
                ["neighborhood", "Bairro"],
                ["phone", "Telefone"],
                ["subject", "Assunto"],
                ["kind", "Tipo de mensagem"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="check-label">
                <input
                  type="checkbox"
                  checked={(
                    data.contact?.fields ?? ["phone", "subject"]
                  ).includes(key)}
                  onChange={(e) => {
                    const fields = data.contact?.fields ?? ["phone", "subject"];
                    change(
                      "contact",
                      "fields",
                      e.target.checked
                        ? [...fields, key]
                        : fields.filter((v) => v !== key),
                    );
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <details className="settings-disclosure">
            <summary>Textos dos campos</summary>
            {text("contact", "nameLabel", "Rótulo do nome", "Nome")}
            {text("contact", "emailLabel", "Rótulo do e-mail", "E-mail")}
            {text(
              "contact",
              "phoneLabel",
              "Rótulo do telefone",
              "Telefone (com DDD)",
            )}
            {text("contact", "subjectLabel", "Rótulo do assunto", "Assunto")}
            {text(
              "contact",
              "messageLabel",
              "Rótulo da mensagem",
              "Sua mensagem",
            )}
            {text(
              "contact",
              "messagePlaceholder",
              "Orientação dentro da mensagem",
              "Como podemos ajudar?",
            )}
            {text(
              "contact",
              "consentText",
              "Texto do consentimento",
              "Autorizo o uso destes dados para responder minha mensagem.",
            )}
          </details>
          <p className="field-hint">
            Nome, e-mail, mensagem e consentimento permanecem obrigatórios para
            receber um contato válido.
          </p>
        </div>
      )}
      {tab === "footer" && (
        <div role="tabpanel">
          <h3>Um rodapé completo e organizado</h3>
          {number(
            "footer",
            "logoWidth",
            "Largura da marca do rodapé",
            180,
            50,
            600,
          )}
          <div className="form-columns">
            {select(
              "footer",
              "layout",
              "Composição do rodapé",
              [
                ["columns", "Colunas editoriais"],
                ["centered", "Centralizado"],
                ["minimal", "Essencial"],
              ],
              "columns",
            )}
            {number(
              "footer",
              "columns",
              "Número de colunas do rodapé",
              4,
              1,
              4,
            )}
            {color("footer", "background", "Fundo do rodapé", "#12241f")}
            {color("footer", "color", "Texto do rodapé", "#ffffff")}
          </div>
          {check("footer", "showLogo", "Mostrar a marca no rodapé")}
          {check("footer", "showMenu", "Mostrar links no rodapé")}
          {check(
            "footer",
            "showCommercial",
            "Mostrar chamada para anunciantes",
          )}
          {check("footer", "showSocials", "Mostrar redes sociais no rodapé")}
          {check("footer", "showSearch", "Mostrar busca no rodapé", false)}
          {check("footer", "showRss", "Mostrar link de notícias RSS")}
          {text("footer", "copyright", "Texto de direitos e créditos")}
          <MediaInput
            portalId={portalId}
            name="footer-logo-control"
            label="Marca exclusiva do rodapé"
            value={data.footer?.logo}
            onChange={(v) => change("footer", "logo", v)}
          />
          <details className="settings-disclosure">
            <summary>Links exclusivos do rodapé</summary>
            <MenuEditor
              name=""
              value={data.footer?.menus || []}
              onChange={(menus) => change("footer", "menus", menus)}
            />
            <p className="field-hint">
              Se não adicionar links, o rodapé acompanha o menu principal.
            </p>
          </details>
          <h3>Convide anunciantes com uma imagem clicável</h3>
          <MediaInput
            portalId={portalId}
            name="footer-advert-control"
            label="Imagem de anúncio do rodapé"
            value={data.footer?.advertImage}
            onChange={(v) => change("footer", "advertImage", v)}
          />
          {text("footer", "advertVideo", "Vídeo comercial do rodapé")}
          {text("footer", "advertLink", "Destino do anúncio do rodapé")}
          {text(
            "footer",
            "advertTitle",
            "Chamada para anunciantes",
            "Anuncie com a gente",
          )}
          <div className="form-columns">
            {color(
              "footer",
              "advertBackground",
              "Fundo da chamada comercial",
              "#285c45",
            )}
            {color(
              "footer",
              "advertColor",
              "Texto da chamada comercial",
              "#ffffff",
            )}
          </div>
        </div>
      )}
      {tab === "partners" && (
        <div role="tabpanel">
          <h3>Dê destaque às marcas parceiras</h3>
          {text(
            "partners",
            "title",
            "Título dos parceiros",
            "Quem caminha com a gente",
          )}
          {text(
            "partners",
            "subtitle",
            "Descrição dos parceiros",
            "Marcas e projetos que fazem parte desta história.",
          )}
          <div className="form-columns">
            {select(
              "partners",
              "layout",
              "Apresentação dos parceiros",
              [
                ["logos", "Galeria de marcas"],
                ["cards", "Cartões com conteúdo"],
                ["showcase", "Vitrine editorial"],
              ],
              "cards",
            )}
            {number(
              "partners",
              "columns",
              "Marcas por linha no computador",
              4,
              2,
              6,
            )}
            {select(
              "partners",
              "imageFit",
              "Ajuste das imagens dos parceiros",
              [
                ["contain", "Preservar a marca inteira"],
                ["cover", "Preencher o cartão"],
              ],
              "contain",
            )}
            {number("partners", "radius", "Cantos dos cartões", 16, 0, 40)}
          </div>
          <div className="form-columns">
            {color(
              "partners",
              "background",
              "Fundo da seção de parceiros",
              "#f5f8f6",
            )}
            {color("partners", "color", "Texto dos parceiros", "#17252a")}
            {color(
              "partners",
              "cardBackground",
              "Fundo de cada parceiro",
              "#ffffff",
            )}
          </div>
          {check("partners", "showNames", "Mostrar nomes das marcas")}
          <p className="field-hint">
            Adicione imagens, vídeos e links em Parceiros. Estes controles
            funcionam em todos os temas.
          </p>
        </div>
      )}
    </section>
  );
}
