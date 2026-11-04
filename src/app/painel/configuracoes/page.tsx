import { requireAdmin } from "@/lib/auth";
export default async function Settings() {
  const { user } = await requireAdmin();
  const vars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "APP_URL",
    "PORTAL_BASE_DOMAIN",
    "VERCEL_API_TOKEN",
    "VERCEL_PROJECT_ID",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  return (
    <>
      <p className="eyebrow">WORKSPACE PRIVADO</p>
      <h1>Configurações gerais</h1>
      <section className="panel">
        <h2>Conta e acesso</h2>
        <p>{user.email}</p>
        <p className="muted">
          O acesso é privado. Cadastros públicos devem permanecer desativados no
          Supabase. Gerencie senha e recuperação pelo processo administrativo
          documentado.
        </p>
      </section>
      <section className="panel">
        <h2>Integrações do ambiente</h2>
        <p className="muted">
          Por segurança, credenciais são configuradas no ambiente de hospedagem
          e seus valores nunca são exibidos aqui.
        </p>
        {vars.map((name) => (
          <div className="record-line" key={name}>
            <code>{name}</code>
            <span
              className={`badge ${process.env[name] ? "published" : "draft"}`}
            >
              {process.env[name] ? "Configurada" : "Pendente"}
            </span>
          </div>
        ))}
        <div className="record-line">
          <strong>FLUE</strong>
          <span
            className={`badge ${process.env.GEMINI_API_KEY || process.env.GEMINI_API || process.env.GOOGLE_API_KEY ? "published" : "draft"}`}
          >
            {process.env.GEMINI_API_KEY ||
            process.env.GEMINI_API ||
            process.env.GOOGLE_API_KEY
              ? "Conectada"
              : "Pendente"}
          </span>
        </div>
      </section>
      <section className="panel">
        <h2>Configuração editorial</h2>
        <p className="muted">
          Use o seletor de portais para personalizar identidade, menus, páginas,
          campanhas e domínios de cada publicação. Armazenamento de imagens:
          Supabase Storage. Horário de edição de agendamentos: UTC.
        </p>
      </section>
    </>
  );
}
