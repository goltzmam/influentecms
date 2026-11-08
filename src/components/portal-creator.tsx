"use client";
import { DomainPicker, type AvailableDomain } from "./domain-picker";
import { useState } from "react";
import { Button } from "./ui/button";
export function PortalCreator({
  action,
  domains = [],
}: {
  action: (f: FormData) => Promise<void>;
  domains?: AvailableDomain[];
}) {
  const [template, setTemplate] = useState("classic"),
    [color, setColor] = useState("#6324dc"),
    [name, setName] = useState("Influente News"),
    [slug, setSlug] = useState("influente-news");
  return (
    <form action={action} className="editor-grid">
      <div>
        <section className="panel">
          <h2>Primeiro, a identidade</h2>
          <label>
            Nome do portal
            <input
              name="name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do seu portal"
            />
          </label>
          <label>
            Endereço provisório
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={63}
              placeholder="meu-portal"
            />
          </label>
          <p className="field-hint">
            Seu endereço provisório continua disponível enquanto você conecta o
            domínio.
          </p>
          <DomainPicker domains={domains} />
          <label>
            URL do logotipo
            <input name="logo" type="url" placeholder="https://..." />
          </label>
          <label>
            Ou envie o logotipo
            <input
              name="logo_file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
            />
          </label>
          <p className="field-hint">
            Até 5 MB. Você pode mudar o logotipo depois.
          </p>
          <label>
            Cor principal
            <input
              name="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </section>
        <section className="panel">
          <h2>Escolha a sua linguagem</h2>
          <div className="template-options">
            {["classic", "modern", "daily"].map((t) => (
              <label
                key={t}
                className={`template-option ${template === t ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t}
                  checked={template === t}
                  onChange={() => {
                    setTemplate(t);
                    if (t === "daily") setColor("#c4170c");
                    if (
                      [
                        "Influente News",
                        "Revista Influente",
                        "Jornal Diário",
                        "",
                      ].includes(name)
                    )
                      setName(
                        t === "daily"
                          ? "Jornal Diário"
                          : t === "classic"
                            ? "Influente News"
                            : "Revista Influente",
                      );
                    if (
                      [
                        "influente-news",
                        "revista-influente",
                        "jornal-diario",
                        "",
                      ].includes(slug)
                    )
                      setSlug(
                        t === "daily"
                          ? "jornal-diario"
                          : t === "classic"
                            ? "influente-news"
                            : "revista-influente",
                      );
                  }}
                />
                <div className={`template-art ${t}`}>
                  <i />
                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <strong>
                  {t === "daily"
                    ? "Jornal Diário"
                    : t === "classic"
                      ? "Influente News"
                      : "Revista Influente"}
                </strong>
                <p>
                  {t === "daily"
                    ? "Manchete visual, notícias em lista e coluna lateral."
                    : t === "classic"
                      ? "Capa editorial com manchetes, vídeos e editorias no formato Influente."
                      : "Reportagem de capa dividida, faixa de histórias e grades editoriais assimétricas."}
                </p>
              </label>
            ))}
          </div>
        </section>
        <Button type="submit">Criar portal →</Button>
      </div>
      <aside className="panel live-identity">
        <span className="eyebrow">SUA IDENTIDADE</span>
        <h2 style={{ color }}>{name || "Seu portal"}</h2>
        <div className={`template-art ${template}`}>
          <i style={{ background: color }} />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
        <p className="muted">
          Você pode mudar o template a qualquer momento sem perder suas
          notícias.
        </p>
      </aside>
    </form>
  );
}
