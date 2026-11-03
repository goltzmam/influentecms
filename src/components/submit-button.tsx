"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({
  children = "Salvar",
}: {
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Salvando…" : children}
    </button>
  );
}
