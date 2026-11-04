"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, LoaderCircle } from "lucide-react";
import { checkDomainConnection } from "@/app/painel/actions";
import { domainRecords, type DomainView } from "@/lib/domain-state";
export function DomainConnection({
  portalId,
  initial,
  enabled,
}: {
  portalId: string;
  initial: DomainView;
  enabled: boolean;
}) {
  const [domain, setDomain] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [automatic, setAutomatic] = useState(enabled),
    [copied, setCopied] = useState("");
  const running = useRef(false);
  const router = useRouter();
  const check = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const f = new FormData();
      f.set("portal_id", portalId);
      f.set("hostname", initial.hostname);
      const result = await checkDomainConnection(f);
      setError(result.error || "");
      if (result.domain) {
        setDomain(result.domain);
        if (result.domain.verified) router.refresh();
      }
      setAutomatic(result.automatic === true);
    } catch {
      setError("Não foi possível consultar agora. Tente novamente.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [portalId, initial.hostname, router]);
  useEffect(() => {
    if (!automatic || domain.verified) return;
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 30000);
    return () => clearInterval(timer);
  }, [automatic, domain.verified, check]);
  const records = domainRecords(domain.hostname, domain.provider_status || {});
  return (
    <div className="domain-connection">
      <div
        className={`domain-status ${domain.verified ? "connected" : "pending"}`}
      >
        <span>
          {domain.verified ? <Check size={18} /> : <Globe size={18} />}
        </span>
        <div>
          <strong>
            {domain.verified
              ? "Conectado ao portal"
              : "Falta apontar seu domínio"}
          </strong>
          <p>
            {domain.verified
              ? "O endereço está configurado. A conexão segura é emitida automaticamente."
              : "Copie os registros no site onde você comprou seu domínio. Mantenha esta página aberta: verificamos a conexão a cada 30 segundos."}
          </p>
        </div>
      </div>
      {!domain.verified && records.length > 0 && (
        <>
          <div className="domain-records">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome / Host</th>
                  <th>Valor / Destino</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={`${r.type}-${i}`}>
                    <td>
                      <strong>{r.type}</strong>
                    </td>
                    <td>
                      <code>{r.name}</code>
                    </td>
                    <td>
                      <div className="dns-value">
                        <code>{r.value}</code>
                        <button
                          className="button-ghost"
                          type="button"
                          aria-label={`Copiar valor ${r.type} ${r.name}`}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(r.value);
                              setCopied(`${i}`);
                            } catch {
                              setError(
                                "Selecione o valor do registro e copie manualmente.",
                              );
                            }
                          }}
                        >
                          {copied === `${i}` ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-hint">
            Remova apontamentos antigos para o mesmo nome. Não altere registros
            de e-mail (MX). As mudanças podem levar até 48 horas para se
            propagar.
          </p>
        </>
      )}
      {error && (
        <p className="notice" role="status">
          {error}
        </p>
      )}
      {!domain.verified && !records.length && (
        <p className="field-hint">
          Os registros aparecerão assim que a conexão for preparada.
        </p>
      )}
      <div className="domain-check-row">
        <button
          type="button"
          className="button button-outline"
          onClick={() => void check()}
          disabled={busy}
        >
          {busy ? (
            <>
              <LoaderCircle size={15} /> Verificando…
            </>
          ) : (
            "Verificar conexão agora"
          )}
        </button>
        <span className="field-hint" role="status">
          {domain.verified
            ? "Conexão confirmada"
            : automatic
              ? "Verificação automática ativa"
              : "Verificação automática aguardando configuração"}
        </span>
      </div>
    </div>
  );
}
