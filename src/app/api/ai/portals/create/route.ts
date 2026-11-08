import { z } from "zod";
import { revalidatePath } from "next/cache";
import { apiOwner, jsonBody, apiError, ApiFailure } from "@/lib/ai/access";
import {
  blueprintSchema,
  creationPayload,
  editsSchema,
  personalize,
} from "@/lib/ai/schema";
import { completeAiPresentation } from "@/lib/ai/presentation";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const auth = await apiOwner(request, true);
    const input = z
      .object({
        jobId: z.uuid(),
        domainId: z.uuid().nullable().optional(),
        edits: editsSchema,
        publishArticles: z.boolean().default(true),
      })
      .safeParse(await jsonBody(request));
    if (!input.success)
      throw new ApiFailure(400, "Revise nome, endereço e cores do projeto.");
    const { data: job, error } = await auth.client
      .from("portal_ai_jobs")
      .select("id,status,plan,generated_portal_id,warnings,visual_status")
      .eq("id", input.data.jobId)
      .eq("organization_id", auth.organizationId)
      .eq("user_id", auth.user.id)
      .single();
    if (error || !job) throw new ApiFailure(404, "Projeto não encontrado.");
    if (job.status === "created" && !job.generated_portal_id)
      throw new ApiFailure(
        409,
        "O portal deste projeto foi removido. Gere um novo projeto.",
      );
    if (job.status === "created" && job.visual_status === "ready") {
      if (input.data.domainId) {
        const bound = await auth.client.rpc("assign_portal_domain", {
          p_domain: input.data.domainId,
          p_portal: job.generated_portal_id,
          p_transfer: false,
        });
        if (bound.error)
          throw new ApiFailure(
            409,
            "O domínio não está disponível. Escolha outro endereço.",
          );
      }
      return Response.json({
        portalId: job.generated_portal_id,
        warnings: job.warnings || [],
      });
    }
    if (!["ready", "created"].includes(job.status))
      throw new ApiFailure(409, "Aguarde a geração do projeto antes de criar.");
    const plan = personalize(blueprintSchema.parse(job.plan), input.data.edits);
    const payload = creationPayload(plan);
    const created =
      job.status === "created"
        ? { data: job.generated_portal_id, error: null }
        : await auth.client.rpc("create_ai_portal_with_domain", {
            p_job: job.id,
            p_plan: payload,
            p_publish_articles: input.data.publishArticles,
            p_domain: input.data.domainId || null,
          });
    if (created.error) {
      if (/domain_|portal_unavailable/.test(created.error.message || ""))
        throw new ApiFailure(
          409,
          "O domínio escolhido já está em uso ou não está disponível. Escolha outro e tente novamente.",
        );
      if (created.error.code === "23505")
        throw new ApiFailure(
          409,
          "Esse endereço já está em uso. Escolha outro slug e tente criar novamente.",
        );
      throw new ApiFailure(
        500,
        "Não foi possível criar o portal. Nenhuma estrutura parcial foi salva.",
      );
    }
    const portalId = created.data as string;
    if (job.status === "created" && input.data.domainId) {
      const bound = await auth.client.rpc("assign_portal_domain", {
        p_domain: input.data.domainId,
        p_portal: portalId,
        p_transfer: false,
      });
      if (bound.error)
        throw new ApiFailure(
          409,
          "O domínio não está disponível. Escolha outro endereço.",
        );
    }
    if (plan.clone?.documentId) {
      const bound=await auth.client.from("portal_clone_documents").update({portal_id:portalId}).eq("id",plan.clone.documentId).eq("organization_id",auth.organizationId).eq("job_id",job.id).select("id").single();
      if(bound.error)throw new ApiFailure(503,"O portal foi criado, mas o layout original precisa ser vinculado. Tente concluir novamente.");
    }
    const claim = await auth.client.rpc("claim_ai_visuals", { p_job: job.id });
    if (claim.error)
      throw new ApiFailure(
        503,
        "Não foi possível iniciar as imagens. Tente novamente.",
      );
    if (!claim.data)
      return Response.json(
        {
          portalId,
          pending: true,
          warnings: [
            "A composição visual ainda está sendo preparada. Aguarde e tente abrir novamente.",
          ],
        },
        { status: 202 },
      );
    let warnings = [...(job.warnings || [])];
    let visual;
    try {
      visual = await completeAiPresentation(
        auth.client,
        auth.organizationId,
        portalId,
        plan,
      );
      warnings = [...warnings, ...visual.warnings];
      const finished = await auth.client.rpc("finish_ai_visuals", {
        p_job: job.id,
        p_ready: visual.ready,
        p_warnings: warnings,
      });
      if (finished.error || !visual.ready)
        throw new Error("Visual setup incomplete");
    } catch {
      await auth.client.rpc("finish_ai_visuals", {
        p_job: job.id,
        p_ready: false,
        p_warnings: [...warnings, "A composição visual precisa ser retomada."],
      });
      throw new ApiFailure(
        503,
        "O portal foi criado. Tente concluir novamente para preparar as imagens; o portal não será duplicado.",
      );
    }
    revalidatePath("/", "layout");
    return Response.json(
      { portalId, warnings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
