import {requireAdmin} from "@/lib/auth";
import Link from "next/link";
import { createPortal } from "../actions";
import { PortalCreator } from "@/components/portal-creator";
export default async function NewPortal({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdmin();
  const { notice } = await searchParams;
  return (
    <>
      <p className="eyebrow">UM NOVO COMEÇO</p>
      <h1>Crie seu portal</h1>
      <p className="muted">
        Sua identidade. Seu conteúdo. Pronto para ganhar o mundo.
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="panel ai-new-banner"><strong>Prefere começar com uma ideia?</strong><p className="muted">Descreva seu portal e deixe a FLUE montar uma estrutura editável.</p><Link className="button button-outline" href="/painel/ia">Criar portal com IA →</Link></div>
      <PortalCreator action={createPortal} />
    </>
  );
}
