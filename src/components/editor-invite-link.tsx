"use client";
import { useState, useTransition } from "react";
import { editorAccessLink } from "@/app/painel/team-actions";
export function EditorInviteLink({
  portalId,
  email,
}: {
  portalId: string;
  email: string;
}) {
  const [url, setUrl] = useState(""),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        className="button-outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const form = new FormData();
            form.set("portal_id", portalId);
            form.set("email", email);
            const result = url ? { url } : await editorAccessLink(form);
            if (!result.url) {
              setMessage(result.error || "Não foi possível criar o convite.");
              return;
            }
            setUrl(result.url);
            try {
              await navigator.clipboard.writeText(result.url);
              setMessage("Convite copiado. Envie somente para este editor.");
            } catch {
              setMessage(
                "Copie o link abaixo e envie somente para este editor.",
              );
            }
          })
        }
      >
        {pending ? "Preparando convite…" : "Copiar convite"}
      </button>
      {message && <p role="status">{message}</p>}
      {message.startsWith("Copie o link") && (
        <input
          readOnly
          aria-label="Link privado de convite"
          value={url}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  );
}
