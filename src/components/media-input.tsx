"use client";
import { useState, useTransition } from "react";
import { uploadMedia } from "@/app/painel/actions";
export function MediaInput({
  portalId,
  name = "image_url",
  value = "",
  label = "Imagem",
  onChange,
}: {
  portalId: string;
  name?: string;
  value?: string;
  label?: string;
  onChange?: (v: string) => void;
}) {
  const [url, setUrl] = useState(value),
    [error, setError] = useState("");
  const [pending, start] = useTransition();
  function update(v: string) {
    setUrl(v);
    onChange?.(v);
  }
  return (
    <div className="media-input">
      <label>
        {label}
        <input
          name={name}
          type="url"
          value={url}
          onChange={(e) => update(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <label className="upload-label">
        {pending ? "Enviando e otimizando…" : "↑ Enviar imagem"}
        <input
          aria-label={`Enviar ${label}`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const f = new FormData();
            f.set("portal_id", portalId);
            f.set("file", file);
            start(async () => {
              const result = await uploadMedia(f);
              if (result.url) {
                update(result.url);
                setError("");
              } else setError(result.error || "Falha no envio.");
            });
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {url && (
        <img
          className="media-thumb"
          src={url}
          alt="Pré-visualização da imagem"
        />
      )}
      <small className="field-hint">
        JPG, PNG, WebP ou AVIF · Até 5 MB. Otimização automática.
      </small>
    </div>
  );
}
