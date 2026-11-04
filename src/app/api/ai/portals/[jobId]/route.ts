import { z } from "zod";
import { apiOwner, apiError, ApiFailure } from "@/lib/ai/access";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const auth = await apiOwner(request);
    const { jobId } = await params;
    if (!z.uuid().safeParse(jobId).success)
      throw new ApiFailure(404, "Projeto não encontrado.");
    const { data, error } = await auth.client
      .from("portal_ai_jobs")
      .select(
        "id,status,brief,reference_urls,plan,reference_results,warnings,generated_portal_id",
      )
      .eq("id", jobId)
      .eq("organization_id", auth.organizationId)
      .eq("user_id", auth.user.id)
      .single();
    if (error || !data) throw new ApiFailure(404, "Projeto não encontrado.");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
