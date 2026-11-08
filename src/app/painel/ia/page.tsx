import { requireAdmin } from "@/lib/auth";
import { AiPortalStudio } from "@/components/ai-portal-studio";
export default async function AiStudioPage() {
  const { client, membership } = await requireAdmin();
  const { data, error } = await client
    .from("portal_ai_jobs")
    .select("id,status,created_at,generated_portal_id,plan")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(5);
  const domains = await client
    .from("domains")
    .select("id,hostname,verified")
    .eq("organization_id", membership.organization_id)
    .is("portal_id", null)
    .order("hostname");
  if (domains.error)
    throw new Error("Não foi possível carregar os domínios disponíveis.");
  return (
    <AiPortalStudio
      domains={domains.data || []}
      configured={Boolean(
        process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API ||
        process.env.GOOGLE_API_KEY,
      )}
      history={
        error
          ? []
          : (data || []).map((j) => ({
              id: j.id,
              status: j.status,
              createdAt: j.created_at,
              portalId: j.generated_portal_id,
              name: j.plan?.name || "Projeto em processamento",
            }))
      }
      migrationReady={!error}
    />
  );
}
