"use client";
import { useActionState, useRef, useState, useId } from "react";
import { Trash2, X, TriangleAlert } from "lucide-react";
import { deletePortal } from "@/app/painel/portal-actions";
export function PortalDeletion({
  id,
  name,
  compact = false,
}: {
  id: string;
  name: string;
  compact?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    label = useId(),
    [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deletePortal, { error: "" });
  function close() {
    if (!pending) {
      dialog.current?.close();
      setConfirmation("");
    }
  }
  return (
    <>
      <button
        type="button"
        className={compact ? "portal-delete-link" : "button button-danger"}
        onClick={() => dialog.current?.showModal()}
        aria-label={`Excluir portal ${name}`}
      >
        <Trash2 size={15} />
        {compact ? "Excluir" : "Excluir portal"}
      </button>
      <dialog
        ref={dialog}
        className="portal-delete-dialog"
        aria-labelledby={label}
        onCancel={(e) => {
          if (pending) e.preventDefault();
          else setConfirmation("");
        }}
      >
        <div className="delete-dialog-heading">
          <span className="danger-icon">
            <TriangleAlert size={25} />
          </span>
          <button
            type="button"
            className="dialog-close"
            onClick={close}
            disabled={pending}
            aria-label="Fechar confirmação"
          >
            <X size={20} />
          </button>
        </div>
        <p className="eyebrow">EXCLUSÃO PERMANENTE</p>
        <h2 id={label}>Excluir {name}?</h2>
        <p>
          O portal sairá do ar. Notícias, páginas, mídia, campanhas, parceiros,
          métricas e acessos da equipe deste portal serão removidos. Os domínios
          ficarão disponíveis na central para vincular a outro portal.
        </p>
        <p className="delete-note">
          Esta ação não pode ser desfeita e afeta somente este portal.
        </p>
        <form action={action}>
          <input type="hidden" name="portal_id" value={id} />
          <label>
            Digite <strong>{name}</strong> para confirmar
            <input
              name="confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              disabled={pending}
              autoFocus
            />
          </label>
          {state.error && (
            <p role="alert" className="delete-error">
              {state.error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={close}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button button-danger"
              disabled={pending || confirmation !== name}
            >
              {pending ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
