"use client";
import Link from "next/link";
export type AvailableDomain = {
  id: string;
  hostname: string;
  verified: boolean;
};
export function DomainPicker({
  domains = [],
  value,
  onChange,
  required = false,
}: {
  domains?: AvailableDomain[];
  required?: boolean;
  value?: string;
  onChange?: (id: string) => void;
}) {
  return (
    <section className="domain-picker">
      <label>
        Domínio para este portal
        <select
          name="domain_id"
          required={required}
          aria-label="Domínio para este portal"
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          <option value="">
            {required
              ? "Escolha um domínio disponível"
              : "Usar endereço provisório por enquanto"}
          </option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.hostname}
              {d.verified ? " · pronto para usar" : " · DNS pendente"}
            </option>
          ))}
        </select>
      </label>
      <p className="field-hint">
        {domains.length
          ? "Mostramos somente domínios que ainda não estão vinculados a outro portal."
          : "Nenhum domínio disponível no momento."}{" "}
        <Link href="/painel/dominios">Gerenciar domínios →</Link>
      </p>
    </section>
  );
}
