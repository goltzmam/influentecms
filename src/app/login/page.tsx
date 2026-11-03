import { login } from "./actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return (
    <main className="login-shell">
      <section className="login-story">
        <a className="brand" href="/">
          influente<span>●</span>
        </a>
        <div>
          <p className="eyebrow">SUA CENTRAL EDITORIAL</p>
          <h1>
            Grandes histórias.
            <br />
            Uma só plataforma.
          </h1>
          <p>
            O espaço para dar voz às suas ideias e organizar sua operação de
            notícias.
          </p>
        </div>
        <small>Influente Comunicação · CMS privado</small>
      </section>
      <section className="login-form">
        <div className="form-wrap">
          <p className="eyebrow">ACESSO EXCLUSIVO</p>
          <h2>Bem-vindo de volta</h2>
          <p className="muted">Entre para cuidar dos seus portais.</p>
          {!configured && (
            <p role="alert" className="notice">
              Configure o Supabase antes de acessar. Consulte o README do
              projeto.
            </p>
          )}
          {error && (
            <p role="alert" className="notice">
              {error === "access"
                ? "Sua conta não tem permissão de administrador."
                : "Não foi possível entrar. Confira suas credenciais e tente novamente."}
            </p>
          )}
          <form action={login}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="voce@empresa.com.br"
            />
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
            <button disabled={!configured} type="submit">
              Entrar no painel <span>→</span>
            </button>
          </form>
          <p className="private-note">
            Acesso restrito à administração.
            <br />
            Não há cadastro público nesta plataforma.
          </p>
        </div>
      </section>
    </main>
  );
}
