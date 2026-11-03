"use client";
import { useState } from "react";
import Link from "next/link";
import type { Article, Category } from "@/lib/types";
export function LeadCarousel({
  articles,
  categories,
  basePath,
}: {
  articles: Article[];
  categories: Category[];
  basePath: string;
}) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, articles.length - 1),
    article = articles[index];
  if (!article) return null;
  const category = categories.find((c) => c.id === article.category_id);
  return (
    <section className="reference-carousel" aria-label="Manchetes">
      <div className="carousel-slides">
        {articles.map((a, i) => (
          <article
            key={a.id}
            hidden={i !== index}
            className={
              a.cover_url ? "carousel-slide" : "carousel-slide no-cover"
            }
          >
            {a.cover_url && (
              <img
                src={a.cover_url}
                alt={a.cover_alt}
                fetchPriority={i === 0 ? "high" : "auto"}
              />
            )}
            <Link
              href={`${basePath}/noticia/${a.slug}`}
              className="carousel-caption"
              aria-label={a.title}
            >
              {category && <span>{category.name}</span>}
              <h2>{a.title}</h2>
            </Link>
          </article>
        ))}
      </div>
      {articles.length > 1 && (
        <div className="carousel-controls" aria-label="Escolher manchete">
          {articles.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Manchete ${i + 1}: ${a.title}`}
              aria-pressed={index === i}
              onClick={() => setSelected(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
