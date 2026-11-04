import { requireAdmin } from "@/lib/auth";
import { AiPortalStudio } from "@/components/ai-portal-studio";
import { defaultModel } from "@/lib/ai/gemini";
export default async function AiStudioPage() {
  const { client, membership } = await requireAdmin();
  const { data, error } = await client
    .from("portal_ai_jobs")
    .select("id,status,created_at,generated_portal_id,plan")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(5);
  return (
    <AiPortalStudio
      configured={Boolean(
        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      )}
      model={process.env.GEMINI_MODEL || defaultModel}
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
