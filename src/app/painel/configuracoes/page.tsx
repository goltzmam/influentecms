import { requireAccess } from "@/lib/auth";
export default async function Settings() {
  const { user, isOwner } = await requireAccess();
  return (
    <>
      <p className="eyebrow">SUA CONTA</p>
      <h1>Configurações gerais</h1>
      <section className="panel">
        <h2>Conta e acesso</h2>
        <p>{user.email}</p>
        <p className="muted">
          {isOwner
            ? "Você administra seus portais e pode convidar editores para cada publicação."
            : "Você pode editar os portais para os quais recebeu um convite."}
        </p>
        <p>
          Para entrar sem senha, solicite um link de acesso na tela de entrada.
        </p>
      </section>
      <section className="panel">
        <h2>Seus portais</h2>
        <p>
          Escolha um portal no menu para editar a página inicial, identidade,
          notícias, anúncios e endereço.
        </p>
      </section>
    </>
  );
}
