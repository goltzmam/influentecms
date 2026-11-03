"use client";
export function DeleteButton() {
  return (
    <button
      className="button-ghost danger"
      onClick={(e) => {
        if (!confirm("Excluir este registro? Esta ação não pode ser desfeita."))
          e.preventDefault();
      }}
    >
      Excluir
    </button>
  );
}
