"use client";
import { useEffect, useState } from "react";
import { assignDomain } from "@/app/painel/domain-actions";
import { SubmitButton } from "./submit-button";
export function DomainAssignment({
  id,
  current,
  portals,
}: {
  id: string;
  current: string | null;
  portals: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(current || "");
  useEffect(() => setValue(current || ""), [current]);
  return (
    <form
      action={assignDomain}
      className="domain-assignment"
      onSubmit={(e) => {
        if (
          current &&
          value &&
          current !== value &&
          !confirm(
            "Transferir este domínio? O endereço passará a abrir o novo portal. O conteúdo dos dois portais será preservado.",
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="domain_id" value={id} />
      <input
        type="hidden"
        name="transfer"
        value={current && value !== current ? "yes" : "no"}
      />
      <label>
        Portal vinculado
        <select
          name="target_portal_id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Disponível — sem portal</option>
          {portals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton>
        {current ? "Salvar vínculo" : "Vincular ao portal"}
      </SubmitButton>
    </form>
  );
}
