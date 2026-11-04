import { z } from "zod";
import { revalidatePath } from "next/cache";
import { apiOwner, jsonBody, apiError, ApiFailure } from "@/lib/ai/access";
import {
  blueprintSchema,
  creationPayload,
  editsSchema,
  personalize,
} from "@/lib/ai/schema";
import { createBrandAssets } from "@/lib/ai/assets";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const auth = await apiOwner(request, true);
    const input = z
      .object({
        jobId: z.uuid(),
        edits: editsSchema,
        publishArticles: z.boolean().default(false),
      })
      .safeParse(await jsonBody(request));
    if (!input.success)
      throw new ApiFailure(400, "Revise nome, endereço e cores do projeto.");
    const { data: job, error } = await auth.client
      .from("portal_ai_jobs")
      .select("id,status,plan,generated_portal_id,warnings")
      .eq("id", input.data.jobId)
      .eq("organization_id", auth.organizationId)
      .eq("user_id", auth.user.id)
      .single();
    if (error || !job) throw new ApiFailure(404, "Projeto não encontrado.");
    if (job.status === "created") {
      if (!job.generated_portal_id)
        throw new ApiFailure(
          409,
          "O portal deste projeto foi removido. Gere um novo projeto.",
        );
      return Response.json({ portalId: job.generated_portal_id, warnings: [] });
    }
    if (job.status !== "ready")
      throw new ApiFailure(409, "Aguarde a geração do projeto antes de criar.");
    const plan = personalize(blueprintSchema.parse(job.plan), input.data.edits);
    const payload = creationPayload(plan);
    const created = await auth.client.rpc("create_portal_from_ai", {
      p_job: job.id,
      p_plan: payload,
      p_publish_articles: input.data.publishArticles,
    });
    if (created.error) {
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
    const assets = await createBrandAssets(
      auth.client,
      auth.organizationId,
      portalId,
      plan,
    );
    const warnings = [...(job.warnings || []), ...assets.warnings];
    if (assets.logo || assets.favicon) {
      const result = await auth.client
        .from("portals")
        .update({
          settings: {
            ...payload.settings,
            logo: assets.logo,
            favicon: assets.favicon,
            ogImage: assets.logo,
          },
        })
        .eq("id", portalId)
        .eq("organization_id", auth.organizationId);
      if (result.error)
        warnings.push(
          "A identidade visual está na biblioteca, mas deve ser selecionada em Personalização.",
        );
    }
    for (const [slug, cover_url] of Object.entries(assets.covers)) {
      const result = await auth.client
        .from("articles")
        .update({ cover_url })
        .eq("portal_id", portalId)
        .eq("slug", slug);
      if (result.error)
        warnings.push("Selecione a capa pela biblioteca ao editar o texto.");
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
