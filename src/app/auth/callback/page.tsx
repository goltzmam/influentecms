"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
export default function ConfirmAccess() {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function confirm() {
      try {
        const client = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        );
        const params = new URLSearchParams(location.search);
        const code = params.get("code");
        const token = params.get("token_hash");
        const type = params.get("type");
        if (token && ["invite", "magiclink", "email"].includes(type || "")) {
          const verified = await client.auth.verifyOtp({
            token_hash: token,
            type: type as "invite" | "magiclink" | "email",
          });
          if (verified.error) throw verified.error;
        } else if (code) {
          const result = await client.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        }
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!session) throw new Error();
        await client.rpc("claim_portal_invitations");
        const next = params.get("next") || "/painel";
        location.replace(
          /^\/painel(?:\/[a-z0-9-]+)*$/.test(next) ? next : "/painel",
        );
      } catch {
        if (active)
          setError(
            "Este link expirou ou já foi usado. Solicite um novo acesso pelo seu e-mail.",
          );
      }
    }
    void confirm();
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="content">
      <h1>{error ? "Não foi possível entrar" : "Confirmando seu acesso…"}</h1>
      <p>{error || "Você será levado diretamente ao seu portal."}</p>
      {error && <a href="/login">Solicitar novo link de acesso</a>}
    </main>
  );
}
