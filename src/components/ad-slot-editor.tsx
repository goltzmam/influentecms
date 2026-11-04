"use client";
import type { AdSlot } from "@/lib/advertising";
import type { Campaign, Section } from "@/lib/types";
import { adFormats } from "@/lib/advertising";
export function AdSlotEditor({
  section,
  update,
  campaigns,
}: {
  section: Section;
  update: (section: Section) => void;
  campaigns: Campaign[];
}) {
  const slots = section.adSlots || [];
  const edit = (id: string, patch: Partial<AdSlot>) =>
    update({
      ...section,
      adSlots: slots.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  const add = (kind: AdSlot["kind"]) => {
    if (slots.length >= 10) return;
    update({
      ...section,
      adSlots: [
        ...slots,
        {
          id: crypto.randomUUID(),
          kind,
          zone: kind === "sponsor" ? "heading" : "after",
          format: kind === "sponsor" ? "sponsor" : "rectangle",
        },
      ],
    });
  };
  return (
    <details
      className="slot-inspector"
      data-edit-control="ads"
      open={slots.length > 0}
    >
      <summary>
        Publicidade nesta seção <span>{slots.length} espaços</span>
      </summary>
      <p>Arraste os espaços na prévia ou defina a posição abaixo.</p>
      <div className="slot-add-actions">
        {(["advertising", "google", "sponsor"] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            className={`slot-palette slot-${kind}`}
            onClick={() => add(kind)}
          >
            {kind === "advertising"
              ? "+ Publicidade"
              : kind === "google"
                ? "+ Google Ads"
                : "+ Patrocinador"}
          </button>
        ))}
      </div>
      {slots.map((slot, i) => (
        <fieldset className={`slot-config slot-${slot.kind}`} key={slot.id}>
          <legend>Espaço {i + 1}</legend>
          <div className="slot-order-tools">
            <button
              type="button"
              className="button-ghost"
              disabled={i === 0}
              aria-label={`Subir espaço ${i + 1}`}
              onClick={() => {
                const next = [...slots];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                update({ ...section, adSlots: next });
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="button-ghost"
              disabled={i === slots.length - 1}
              aria-label={`Descer espaço ${i + 1}`}
              onClick={() => {
                const next = [...slots];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                update({ ...section, adSlots: next });
              }}
            >
              ↓
            </button>
          </div>
          <div className="form-columns">
            <label>
              Tipo do espaço
              <select
                aria-label="Tipo do espaço"
                value={slot.kind}
                onChange={(e) =>
                  edit(slot.id, { kind: e.target.value as AdSlot["kind"] })
                }
              >
                <option value="advertising">Publicidade</option>
                <option value="google">Google Ads</option>
                <option value="sponsor">Patrocinador</option>
              </select>
            </label>
            <label>
              Localização
              <select
                aria-label="Localização do espaço"
                value={slot.zone}
                onChange={(e) =>
                  edit(slot.id, { zone: e.target.value as AdSlot["zone"] })
                }
              >
                <option value="before">Antes da seção</option>
                <option value="heading">Junto ao título</option>
                <option value="sidebar">Lateral da seção</option>
                <option value="after">Depois da seção</option>
              </select>
            </label>
          </div>
          <label>
            Formato
            <select
              aria-label="Formato do espaço"
              value={slot.format}
              onChange={(e) =>
                edit(slot.id, { format: e.target.value as AdSlot["format"] })
              }
            >
              {Object.entries(adFormats).map(([name, size]) => (
                <option key={name} value={name}>
                  {
                    {
                      billboard: "Super banner",
                      leaderboard: "Horizontal",
                      rectangle: "Retângulo",
                      skyscraper: "Vertical",
                      square: "Quadrado",
                      native: "Editorial",
                      sponsor: "Patrocínio",
                    }[name as keyof typeof adFormats]
                  }{" "}
                  · {size[0]} × {size[1]}
                </option>
              ))}
              <option value="custom">Tamanho personalizado</option>
            </select>
          </label>
          {slot.format === "custom" && (
            <div className="form-columns">
              <label>
                Largura
                <input
                  aria-label="Largura do espaço"
                  type="number"
                  min={100}
                  max={2500}
                  value={slot.width || 300}
                  onChange={(e) =>
                    edit(slot.id, { width: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Altura
                <input
                  aria-label="Altura do espaço"
                  type="number"
                  min={50}
                  max={2000}
                  value={slot.height || 250}
                  onChange={(e) =>
                    edit(slot.id, { height: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          )}
          {slot.kind === "google" ? (
            <label>
              Identificador do bloco Google
              <input
                aria-label="Identificador do bloco Google"
                value={slot.googleSlot || ""}
                inputMode="numeric"
                placeholder="Ex.: 1234567890"
                onChange={(e) =>
                  edit(slot.id, { googleSlot: e.target.value.trim() })
                }
              />
            </label>
          ) : (
            <label>
              Peça deste portal
              <select
                aria-label="Peça do espaço"
                value={slot.campaignId || ""}
                onChange={(e) => edit(slot.id, { campaignId: e.target.value })}
              >
                <option value="">Escolher campanha</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="form-columns">
            <label>
              Exibir em
              <select
                aria-label="Dispositivos do espaço"
                value={slot.device || "all"}
                onChange={(e) =>
                  edit(slot.id, { device: e.target.value as AdSlot["device"] })
                }
              >
                <option value="all">Todos</option>
                <option value="desktop">Computador</option>
                <option value="mobile">Celular</option>
              </select>
            </label>
            <label>
              Cor do espaço
              <input
                aria-label="Cor do espaço"
                type="color"
                value={
                  slot.background ||
                  (slot.kind === "google"
                    ? "#e4e4e7"
                    : slot.kind === "sponsor"
                      ? "#fa8a28"
                      : "#ffd21a")
                }
                onChange={(e) => edit(slot.id, { background: e.target.value })}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              type="checkbox"
              checked={slot.showEmpty || false}
              onChange={(e) => edit(slot.id, { showEmpty: e.target.checked })}
            />
            Mostrar espaço vazio no portal
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={slot.enabled !== false}
              onChange={(e) => edit(slot.id, { enabled: e.target.checked })}
            />
            Espaço ativo
          </label>
          <button
            type="button"
            className="button-ghost danger"
            onClick={() =>
              update({
                ...section,
                adSlots: slots.filter((s) => s.id !== slot.id),
              })
            }
          >
            Remover espaço
          </button>
        </fieldset>
      ))}
    </details>
  );
}
