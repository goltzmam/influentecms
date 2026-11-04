"use client";
import { useState } from "react";
import { parseGoogleAdCode, type Advertising } from "@/lib/advertising";
export function AdvertisingEditor({
  value = {},
  onChange,
  name = "advertising",
}: {
  value?: Advertising;
  onChange?: (value: Advertising) => void;
  name?: string;
}) {
  const [own, setOwn] = useState(value),
    [code, setCode] = useState(""),
    [message, setMessage] = useState("");
  const current = onChange ? value : own;
  const edit = (patch: Partial<Advertising>) => {
    const next = { ...current, ...patch };
    setOwn(next);
    onChange?.(next);
  };
  return (
    <section className="panel advertising-settings">
      <span className="eyebrow">MONETIZAÇÃO</span>
      <h2>Google AdSense</h2>
      <p>
        Conecte sua conta e escolha os espaços pelo editor visual. Publicidade,
        Google Ads e patrocínio têm controles independentes.
      </p>
      {name && (
        <input type="hidden" name={name} value={JSON.stringify(current)} />
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={current.enabled || false}
          onChange={(e) => edit({ enabled: e.target.checked })}
        />
        Ativar Google AdSense neste portal
      </label>
      <label>
        Identificador do Google
        <input
          aria-label="Identificador do Google"
          value={current.publisherId || ""}
          placeholder="ca-pub-0000000000000000"
          onChange={(e) => edit({ publisherId: e.target.value.trim() })}
        />
      </label>
      <details>
        <summary>Colar código do Google</summary>
        <label>
          Código do AdSense
          <textarea
            aria-label="Código do AdSense"
            rows={5}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Cole o código fornecido pelo Google AdSense"
          />
        </label>
        <button
          type="button"
          className="button-outline"
          onClick={() => {
            try {
              const parsed = parseGoogleAdCode(code);
              edit({ publisherId: parsed.publisherId, enabled: true });
              setMessage(
                parsed.slot
                  ? `Conta reconhecida. Use o bloco ${parsed.slot} no espaço desejado.`
                  : "Conta reconhecida. Escolha os espaços no editor visual.",
              );
              setCode("");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Código inválido.");
            }
          }}
        >
          Importar código
        </button>
        {message && <p role="status">{message}</p>}
      </details>
      <label className="check-label">
        <input
          type="checkbox"
          checked={current.autoAds || false}
          onChange={(e) => edit({ autoAds: e.target.checked })}
        />
        Permitir anúncios automáticos do Google
      </label>
      <p className="field-hint">
        Anúncios reais aparecem somente no portal publicado. A exibição depende
        da sua conta e da aprovação do Google. No editor, mostramos uma
        representação dos espaços.
      </p>
    </section>
  );
}
