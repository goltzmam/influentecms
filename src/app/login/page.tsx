import { login, emailLogin } from "./actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
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
              O acesso está temporariamente indisponível. Tente novamente em
              instantes.
            </p>
          )}
          {error && (
            <p role="alert" className="notice">
              {error === "delivery_setup"
                ? "O envio de e-mails ainda precisa ser ativado. Peça à administração para compartilhar um link em Copiar convite."
                : error === "delivery"
                  ? "Não foi possível enviar o link agora. Peça um convite à administração ou tente novamente em instantes."
                  : error === "access"
                    ? "Este e-mail ainda não foi autorizado para nenhum portal."
                    : "Não foi possível entrar. Confira suas credenciais e tente novamente."}
            </p>
          )}
          {sent && (
            <p className="notice" role="status">
              Se este e-mail estiver autorizado, você receberá um link para
              entrar sem senha. Confira também a pasta de spam.
            </p>
          )}
          <form action={emailLogin}>
            <label>
              Endereço de acesso
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@empresa.com.br"
              />
            </label>
            <button disabled={!configured} type="submit">
              Receber link de acesso
            </button>
            <p className="field-hint">
              Para editores convidados. Não é preciso criar senha.
            </p>
          </form>
          <details open>
            <summary>Entrar com senha de administrador</summary>
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
          </details>
          <p className="private-note">
            Acesso restrito a pessoas convidadas.
            <br />
            Não há cadastro público nesta plataforma.
          </p>
        </div>
      </section>
    </main>
  );
}
