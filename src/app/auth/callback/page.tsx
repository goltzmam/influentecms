"use client";
import { useEffect, useRef, useState } from "react";
import { readAccessLink } from "@/lib/access-link";
export default function ConfirmAccess() {
  const input = useRef<ReturnType<typeof readAccessLink> | null>(null),
    running = useRef(false);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (input.current) return;
    input.current = readAccessLink(location.href);
    // Keep one-time secrets in memory only, before any SDK or remote request can inspect the URL.
    history.replaceState(null, "", "/auth/callback");
    if (input.current.providerError)
      setError(
        input.current.providerError === "otp_expired"
          ? "Este link expirou ou já foi usado. Solicite um novo link e use o e-mail mais recente."
          : "Não foi possível validar este convite. Peça um novo link à administração.",
      );
    else if (!input.current.payload)
      setError(
        "Este endereço não contém um convite válido. Solicite um novo link de acesso.",
      );
    setReady(true);
  }, []);
  async function confirm() {
    if (running.current || !input.current?.payload) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.current.payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível confirmar o acesso.");
      location.replace(result.next);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível conectar. Tente novamente.",
      );
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="login-shell access-confirm-shell">
      <section className="panel access-confirm-card">
        <a className="brand" href="/">
          influente<span>●</span>
        </a>
        <p className="eyebrow">ACESSO À SUA REDAÇÃO</p>
        <h1>
          {busy ? "Confirmando seu acesso…" : "Seu portal espera por você"}
        </h1>
        <p>
          {busy
            ? "Aguarde enquanto abrimos seu ambiente."
            : "Confirme abaixo para entrar com segurança, sem precisar de senha."}
        </p>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {ready && input.current?.payload && !input.current.providerError && (
          <button
            className="button"
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy ? "Entrando…" : "Confirmar e entrar no portal"}
          </button>
        )}
        {error && <a href="/login">Solicitar novo link de acesso</a>}
        <p className="field-hint">
          Use o convite mais recente. Cada link permite uma confirmação.
        </p>
      </section>
    </main>
  );
}
