"use client";
import { useState } from "react";
import { MediaInput } from "./media-input";
export function SocialCardsEditor({
  portalId,
  value = [],
}: {
  portalId: string;
  value?: { label: string; image: string; url: string }[];
}) {
  const [cards, setCards] = useState(value);
  return (
    <div>
      <input name="socialCards" type="hidden" value={JSON.stringify(cards)} />
      {cards.map((card, i) => (
        <div className="social-card-editor" key={i}>
          <label>
            Nome da rede ou bloco
            <input
              value={card.label}
              maxLength={80}
              onChange={(e) =>
                setCards(
                  cards.map((c, n) =>
                    n === i ? { ...c, label: e.target.value } : c,
                  ),
                )
              }
            />
          </label>
          <label>
            Link do perfil ou página
            <input
              value={card.url}
              onChange={(e) =>
                setCards(
                  cards.map((c, n) =>
                    n === i ? { ...c, url: e.target.value } : c,
                  ),
                )
              }
            />
          </label>
          <MediaInput
            portalId={portalId}
            name={`social-card-${i}`}
            label="Imagem do bloco social"
            value={card.image}
            onChange={(image) =>
              setCards((current) =>
                current.map((c, n) => (n === i ? { ...c, image } : c)),
              )
            }
          />
          <button
            type="button"
            className="button-ghost danger"
            onClick={() => setCards(cards.filter((_, n) => n !== i))}
          >
            Remover bloco
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button-outline"
        disabled={cards.length >= 3}
        onClick={() => setCards([...cards, { label: "", image: "", url: "" }])}
      >
        + Adicionar bloco social
      </button>
      <p className="field-hint">
        Envie uma imagem e adicione o link do seu perfil. Não são exibidos
        seguidores ou curtidas fictícias.
      </p>
    </div>
  );
}
