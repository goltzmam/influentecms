"use client";
import { useState } from "react";
import type { Article, Category } from "@/lib/types";
import { saveArticle } from "@/app/painel/actions";
import { RichEditor } from "./rich-editor";
import { MediaInput } from "./media-input";
import { SubmitButton } from "./submit-button";
export function ArticleForm({
  portalId,
  article,
  categories,
}: {
  portalId: string;
  article?: Article;
  categories: Category[];
}) {
  const [status, setStatus] = useState(article?.status || "draft");
  return (
    <form action={saveArticle}>
      <input type="hidden" name="portal_id" value={portalId} />
      <input type="hidden" name="id" value={article?.id || ""} />
      <div className="editor-grid">
        <div>
          <section className="panel">
            <label>
              Título
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={article?.title}
                placeholder="Uma grande história começa com um bom título"
                className="title-input"
              />
            </label>
            <label>
              URL amigável
              <input
                name="slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={63}
                required
                defaultValue={article?.slug}
                placeholder="titulo-da-noticia"
              />
            </label>
            <label>
              Subtítulo
              <textarea
                name="subtitle"
                maxLength={400}
                defaultValue={article?.subtitle}
              />
            </label>
            <label>Conteúdo</label>
            <RichEditor value={article?.content} portalId={portalId} />
          </section>
          <section className="panel">
            <h2>Como sua notícia aparece nas buscas</h2>
            <label>
              Título SEO
              <input
                name="seo_title"
                maxLength={70}
                defaultValue={article?.seo_title}
              />
            </label>
            <label>
              Descrição SEO
              <textarea
                name="seo_description"
                maxLength={180}
                defaultValue={article?.seo_description}
              />
            </label>
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>Publicação</h2>
            <label>
              Status
              <select
                aria-label="Status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicar agora</option>
                <option value="scheduled">Agendar publicação</option>
              </select>
            </label>
            <label>
              Data de publicação (UTC)
              <input
                type="datetime-local"
                name="publish_at"
                required={status === "scheduled"}
                defaultValue={article?.publish_at?.slice(0, 16)}
              />
            </label>
            <label>
              Autor
              <input
                name="author"
                maxLength={120}
                defaultValue={article?.author}
                required
              />
            </label>
            <label>
              Categoria
              <select
                aria-label="Categoria"
                name="category_id"
                defaultValue={article?.category_id || ""}
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tags (separadas por vírgulas)
              <input name="tags" defaultValue={article?.tags.join(", ")} />
            </label>
            <SubmitButton>Salvar notícia</SubmitButton>
            {article && (
              <a
                className="text-link"
                href={`/painel/${portalId}/preview/noticia/${article.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Pré-visualizar versão salva ↗
              </a>
            )}
          </section>
          <section className="panel">
            <h2>Imagem de capa</h2>
            <MediaInput
              portalId={portalId}
              name="cover_url"
              value={article?.cover_url}
            />
            <label>
              Descrição da imagem
              <input
                name="cover_alt"
                maxLength={300}
                defaultValue={article?.cover_alt}
              />
            </label>
          </section>
        </aside>
      </div>
    </form>
  );
}
