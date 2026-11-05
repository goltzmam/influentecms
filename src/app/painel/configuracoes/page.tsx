import Link from "next/link";
import {
  UserRound,
  ShieldCheck,
  ArrowUpRight,
  Globe2,
  Sparkles,
} from "lucide-react";
import { requireAccess } from "@/lib/auth";
export default async function Settings() {
  const { user, isOwner, portalIds } = await requireAccess();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEU WORKSPACE</p>
          <h1>Configurações gerais</h1>
          <p className="muted">
            Sua conta e os caminhos para cuidar das suas publicações.
          </p>
        </div>
      </div>
      <div className="account-settings-grid">
        <section className="panel account-profile">
          <span className="settings-icon">
            <UserRound size={24} />
          </span>
          <h2>Sua conta</h2>
          <p className="account-address">{user.email}</p>
          <span className="badge">
            <ShieldCheck size={12} />{" "}
            {isOwner ? "Administrador" : "Editor do portal"}
          </span>
          <p className="muted">
            {isOwner
              ? "Você administra seus portais e pode convidar editores para cada publicação."
              : "Você pode editar os portais para os quais recebeu um convite."}
          </p>
          <div className="account-tip">
            <strong>Acesso sem senha</strong>
            <p>
              Solicite um link de acesso na tela de entrada para entrar pela
              confirmação do seu e-mail.
            </p>
          </div>
        </section>
        <div className="account-settings-links">
          <section className="panel">
            <span className="settings-icon">
              <Globe2 size={24} />
            </span>
            <h2>Seus portais</h2>
            <p className="muted">
              Identidade, conteúdo, equipe e endereços. Cada portal tem suas
              próprias configurações.
            </p>
            <Link
              className="button button-outline"
              href={isOwner ? "/painel" : `/painel/${portalIds[0]}`}
            >
              Gerenciar portais <ArrowUpRight size={15} />
            </Link>
          </section>
          {isOwner && (
            <section className="panel">
              <span className="settings-icon">
                <Sparkles size={24} />
              </span>
              <h2>Seu próximo projeto</h2>
              <p className="muted">
                Transforme uma ideia em um novo portal, com uma identidade que
                você pode personalizar.
              </p>
              <Link className="button button-outline" href="/painel/ia">
                Abrir estúdio FLUE <ArrowUpRight size={15} />
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
