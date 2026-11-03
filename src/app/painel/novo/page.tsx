import { createPortal } from "../actions";
import { PortalCreator } from "@/components/portal-creator";
export default async function NewPortal({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
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
      <PortalCreator action={createPortal} />
    </>
  );
}
