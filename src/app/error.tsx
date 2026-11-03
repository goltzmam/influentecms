"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>Não foi possível carregar o painel</h1>
      <p>
        Verifique a conexão e a configuração do Supabase. Seus dados não foram
        alterados.
      </p>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  );
}
